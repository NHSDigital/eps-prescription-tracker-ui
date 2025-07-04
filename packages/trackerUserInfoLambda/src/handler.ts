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
  authenticationMiddleware,
  AuthResult
} from "@cpt-ui-common/authFunctions"
import {getTokenMapping, updateTokenMapping} from "@cpt-ui-common/dynamoFunctions"
import {extractInboundEventValues, appendLoggerKeys} from "@cpt-ui-common/lambdaUtils"
import axios from "axios"

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

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEventBase<AuthResult>): Promise<APIGatewayProxyResult> => {
  const {loggerKeys} = extractInboundEventValues(event)
  appendLoggerKeys(logger, loggerKeys)
  const username = event.requestContext.authorizer.username

  // First, try to use cached user info
  const tokenMappingItem = await getTokenMapping(documentClient, tokenMappingTableName, username, logger)
  const cachedUserInfo = {
    roles_with_access: tokenMappingItem?.rolesWithAccess || [],
    roles_without_access: tokenMappingItem?.rolesWithoutAccess || [],
    currently_selected_role: tokenMappingItem?.currentlySelectedRole || undefined,
    user_details: tokenMappingItem?.userDetails || {family_name: "", given_name: ""}
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
        || !tokenMappingItem.cis2IdToken
        || !tokenMappingItem.cis2AccessToken
    ) {
      throw new Error("Authentication failed for cis2: missing tokens")
    }
  }

  const userInfoResponse = await fetchUserInfo(
    tokenMappingItem.cis2AccessToken || "",
    tokenMappingItem.cis2IdToken || "",
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

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "UserInfo fetched successfully from the OIDC endpoint",
      userInfo: userInfoResponse
    })
  }
}

export const handler = middy(lambdaHandler)
  .use(authenticationMiddleware(axiosInstance, documentClient, authenticationParameters, logger))
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(httpHeaderNormalizer())
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(middyErrorHandler.errorHandler({logger: logger}))
