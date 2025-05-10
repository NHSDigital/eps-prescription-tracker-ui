import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {
  getUsernameFromEvent,
  authenticateRequest,
  fetchAndVerifyCIS2Tokens,
  initializeAuthConfig,
  updateCachedUserInfo,
  fetchCachedUserInfo
} from "@cpt-ui-common/authFunctions"
import {fetchUserInfo} from "./userInfoHelpers"

/*
This is the lambda code to get user info
It expects the following environment variables to be set

CIS2_OIDC_ISSUER
CIS2_OIDC_CLIENT_ID
CIS2_OIDCJWKS_ENDPOINT
CIS2_USER_INFO_ENDPOINT
CIS2_USER_POOL_IDP

apigeeMockTokenEndpoint
apigeeCIS2TokenEndpoint
TokenMappingTableName
jwtPrivateKeyArn
jwtKid
APIGEE_API_KEY
APIGEE_API_SECRET
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
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

// Create auth config
// this is outside functions so it can be re-used and caching works
const authConfig = initializeAuthConfig()

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const CPT_ACCESS_ACTIVITY_CODES = ["B0570", "B0278"]

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  const username = getUsernameFromEvent(event)

  // First, try to use cached user info
  const cachedUserInfo = await fetchCachedUserInfo(username, documentClient, logger, authConfig.tokenMappingTableName)

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

  let userInfoResponse
  if (username.startsWith("Mock_")) {
    const authResult = await authenticateRequest(event, documentClient, logger, authConfig)

    userInfoResponse = await fetchUserInfo(
      authResult.apigeeAccessToken,
      null,
      CPT_ACCESS_ACTIVITY_CODES,
      logger,
      authConfig.oidcConfig.oidcTokenEndpoint
    )
  } else {
    const authResult = await fetchAndVerifyCIS2Tokens(
      event,
      documentClient,
      logger,
      authConfig.oidcConfig
    )

    userInfoResponse = await fetchUserInfo(
      authResult.cis2AccessToken,
      authResult.cis2IdToken,
      CPT_ACCESS_ACTIVITY_CODES,
      logger,
      authConfig.oidcConfig.oidcTokenEndpoint
    )
  }

  // Save user info to DynamoDB (but not tokens)
  await updateCachedUserInfo(username, userInfoResponse, documentClient, logger, authConfig.tokenMappingTableName)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "UserInfo fetched successfully from the OIDC endpoint",
      userInfo: userInfoResponse
    })
  }
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(middyErrorHandler.errorHandler({logger: logger}))
