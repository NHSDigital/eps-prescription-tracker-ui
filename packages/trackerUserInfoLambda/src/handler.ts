import {APIGatewayProxyEventBase, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import httpHeaderNormalizer from "@middy/http-header-normalizer"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {
  initializeOidcConfig,
  fetchUserInfo,
  authParametersFromEnv,
  authenticationConcurrentAwareMiddleware,
  AuthResult
} from "@cpt-ui-common/authFunctions"
import {getTokenMapping, updateTokenMapping, TokenMappingItem} from "@cpt-ui-common/dynamoFunctions"
import {injectCorrelationLoggerMiddleware} from "@cpt-ui-common/lambdaUtils"
import axios from "axios"
import {RoleDetails} from "@cpt-ui-common/common-types"

/*
This is the lambda code to get user info
It expects the following environment variables to be set

CIS2_OIDC_ISSUER
CIS2_OIDC_CLIENT_ID
CIS2_OIDCJWKS_ENDPOINT
CIS2_USER_INFO_ENDPOINT
CIS2_USER_POOL_IDP

TokenMappingTableName
MOCK_MODE_ENABLED

For mock calls, the following must be set
MOCK_OIDC_ISSUER
MOCK_OIDC_CLIENT_ID
MOCK_OIDCJWKS_ENDPOINT
MOCK_USER_INFO_ENDPOINT
MOCK_USER_POOL_IDP
*/
const logger = new Logger({serviceName: "trackerUserInfo"})

const dynamoClient = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true
  }})

const axiosInstance = axios.create()

// Create a config for cis2 and mock
// this is outside functions so it can be re-used and caching works
const {mockOidcConfig, cis2OidcConfig} = initializeOidcConfig()

const authenticationParameters = authParametersFromEnv()
const tokenMappingTableName = authenticationParameters.tokenMappingTableName
const sessionManagementTableName = authenticationParameters.sessionManagementTableName

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEventBase<AuthResult>): Promise<APIGatewayProxyResult> => {
  const sessionId = event.requestContext.authorizer.sessionId
  const username = event.requestContext.authorizer.username
  const isConcurrentSession = event.requestContext.authorizer.isConcurrentSession

  let tokenDetails: TokenMappingItem | undefined = undefined
  if (isConcurrentSession) {
    logger.info(`Gaining concurrent session details, for sessionId ${sessionId}`)
    tokenDetails = await getTokenMapping(documentClient, sessionManagementTableName,
      username, logger)
  } else {
    logger.info(`Gaining primary session details, for sessionId ${sessionId}`)
    tokenDetails = await getTokenMapping(documentClient, tokenMappingTableName, username, logger)
  }

  type CachedUserInfo = {
    roles_with_access: Array<RoleDetails> | [],
    roles_without_access: Array<RoleDetails> | [],
    currently_selected_role: RoleDetails | undefined,
    user_details: {
      family_name: string,
      given_name: string
    },
    is_concurrent_session?: boolean,
    sessionId?: string,
    remainingSessionTime?: number
  }

  // Calculate remaining session time based on lastActivityTime
  const fifteenMinutes = 15 * 60 * 1000
  let remainingSessionTime: number | undefined = undefined

  if (tokenDetails?.lastActivityTime) {
    const timeSinceLastActivity = Date.now() - tokenDetails.lastActivityTime
    remainingSessionTime = Math.max(0, fifteenMinutes - timeSinceLastActivity)
  }

  const cachedUserInfo: CachedUserInfo = {
    roles_with_access: tokenDetails?.rolesWithAccess || [],
    roles_without_access: tokenDetails?.rolesWithoutAccess || [],
    currently_selected_role: tokenDetails?.currentlySelectedRole || undefined,
    user_details: tokenDetails?.userDetails || {family_name: "", given_name: ""},
    is_concurrent_session: isConcurrentSession,
    sessionId: sessionId,
    remainingSessionTime: remainingSessionTime
  }

  if (
    cachedUserInfo &&
    (cachedUserInfo.roles_with_access.length > 0 || cachedUserInfo.roles_without_access.length > 0)
  ) {
    logger.info("Returning cached user info from DynamoDB", {cachedUserInfo})
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "UserInfo fetched successfully from DynamoDB",
        userInfo: cachedUserInfo
      })
    }
  }

  logger.info("No valid cached user info found. Authenticating and calling userinfo endpoint...")
  const isMockToken = username.startsWith("Mock_")
  const apigeeAccessToken = event.requestContext.authorizer.apigeeAccessToken

  if (isMockToken) {
    if (!apigeeAccessToken) {
      throw new Error("Authentication failed for mock: missing tokens")
    }
  } else {
    if (!apigeeAccessToken
        || !tokenDetails?.cis2IdToken
        || !tokenDetails?.cis2AccessToken
    ) {
      throw new Error("Authentication failed for cis2: missing tokens")
    }
  }

  const userInfoResponse = await fetchUserInfo(
    tokenDetails?.cis2AccessToken || "",
    tokenDetails?.cis2IdToken || "",
    apigeeAccessToken || "",
    isMockToken,
    logger,
    isMockToken ? mockOidcConfig : cis2OidcConfig
  )

  // Save user info to DynamoDB (but not tokens)
  const item = {
    username,
    rolesWithAccess: userInfoResponse.roles_with_access,
    rolesWithoutAccess: userInfoResponse.roles_without_access,
    currentlySelectedRole: userInfoResponse.currently_selected_role,
    userDetails: userInfoResponse.user_details,
    lastActivityTime: Date.now()
  }
  await updateTokenMapping(documentClient, tokenMappingTableName, item, logger)

  // For fresh responses, user just made a request so they have full 15 minutes
  const freshremainingSessionTime = 15 * 60 * 1000 // Full 15 minutes

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "UserInfo fetched successfully from the OIDC endpoint",
      userInfo: {
        ...userInfoResponse,
        is_concurrent_session: isConcurrentSession,
        sessionId: sessionId,
        remainingSessionTime: freshremainingSessionTime
      }
    })
  }
}

// the order of middleware is important here
// injectLambdaContext and httpHeaderNormalizer should be first to ensure logging is set up
// and headers are normalized, which is needed for logging
export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(httpHeaderNormalizer())
  .use(injectCorrelationLoggerMiddleware(logger))
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(authenticationConcurrentAwareMiddleware({
    axiosInstance,
    ddbClient: documentClient,
    authOptions: authenticationParameters,
    logger
  }, true))
  .use(middyErrorHandler.errorHandler({logger: logger}))
