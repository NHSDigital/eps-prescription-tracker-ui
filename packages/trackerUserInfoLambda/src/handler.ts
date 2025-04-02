import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {getUsernameFromEvent, fetchAndVerifyCIS2Tokens, initializeOidcConfig} from "@cpt-ui-common/authFunctions"
import {fetchUserInfo, updateDynamoTable, fetchDynamoTable} from "./userInfoHelpers"

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
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

// Create a config for cis2 and mock
// this is outside functions so it can be re-used and caching works
const {mockOidcConfig, cis2OidcConfig} = initializeOidcConfig()

const MOCK_MODE_ENABLED = process.env["MOCK_MODE_ENABLED"]
const tokenMappingTableName = process.env["TokenMappingTableName"] ?? ""

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const CPT_ACCESS_ACTIVITY_CODES = ["B0570", "B0278"]

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  // Mock usernames start with "Mock_", and real requests use usernames starting with "Primary_"
  const username = getUsernameFromEvent(event)
  const isMockToken = username.startsWith("Mock_")

  // Determine whether this request should be treated as mock or real.
  if (isMockToken && MOCK_MODE_ENABLED !== "true") {
    throw new Error("Trying to use a mock user when mock mode is disabled")
  }

  const isMockRequest = MOCK_MODE_ENABLED === "true" && isMockToken

  logger.info("Is this a mock request?", {isMockRequest})

  // Fetch user info from DynamoDB
  const cachedUserInfo = await fetchDynamoTable(username, documentClient, logger, tokenMappingTableName)

  // Check if cached data exists and has valid role information
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

  logger.info("No valid cached user info found. Fetching from OIDC UserInfo endpoint...")

  // If no cached data found, proceed to fetch user info from the OIDC UserInfo endpoint
  const {cis2AccessToken, cis2IdToken} = await fetchAndVerifyCIS2Tokens(
    event,
    documentClient,
    logger,
    isMockRequest ? mockOidcConfig : cis2OidcConfig
  )

  const userInfoResponse = await fetchUserInfo(
    cis2AccessToken,
    cis2IdToken,
    CPT_ACCESS_ACTIVITY_CODES,
    logger,
    isMockRequest ? mockOidcConfig : cis2OidcConfig
  )

  // Store the new data in DynamoDB
  await updateDynamoTable(username, userInfoResponse, documentClient, logger, tokenMappingTableName)

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
