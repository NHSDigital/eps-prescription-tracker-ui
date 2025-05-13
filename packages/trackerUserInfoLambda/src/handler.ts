import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {getUsernameFromEvent, initializeOidcConfig, authenticateRequest} from "@cpt-ui-common/authFunctions"
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

// External endpoints and environment variables
const apigeeCIS2TokenEndpoint = process.env["apigeeCIS2TokenEndpoint"] as string
const apigeeMockTokenEndpoint = process.env["apigeeMockTokenEndpoint"] as string
const tokenMappingTableName = process.env["TokenMappingTableName"] ?? ""
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const apigeeApiKey = process.env["APIGEE_API_KEY"] as string
const apigeeApiSecret = process.env["APIGEE_API_SECRET"] as string
const jwtKid = process.env["jwtKid"] as string

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  const username = getUsernameFromEvent(event)

  // First, try to use cached user info
  const cachedUserInfo = await fetchDynamoTable(username, documentClient, logger, tokenMappingTableName)
  logger.debug("retrieved this from dynamodb", {cachedUserInfo})

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
  const authResult = await authenticateRequest(event, documentClient, logger, {
    tokenMappingTableName,
    jwtPrivateKeyArn,
    apigeeApiKey,
    apigeeApiSecret,
    jwtKid,
    oidcConfig: isMockToken ? mockOidcConfig : cis2OidcConfig,
    mockModeEnabled: isMockToken,
    apigeeTokenEndpoint: isMockToken ? apigeeMockTokenEndpoint : apigeeCIS2TokenEndpoint
  })

  if (!authResult.apigeeAccessToken || !authResult.cis2IdToken) {
    throw new Error("Authentication failed: missing tokens")
  }

  const userInfoResponse = await fetchUserInfo(
    authResult.apigeeAccessToken,
    authResult.cis2IdToken,
    logger,
    isMockToken ? mockOidcConfig : cis2OidcConfig
  )

  // Save user info to DynamoDB (but not tokens)
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
