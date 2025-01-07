import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import jwksClient from "jwks-rsa"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {getUsernameFromEvent, fetchAndVerifyCIS2Tokens, OidcConfig} from "@cpt-ui-common/authFunctions"
import {fetchUserInfo, updateDynamoTable} from "./userInfoHelpers"

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

// Create a JWKS client for cis2 and mock
// this is outside functions so it can be re-used
const cis2JwksUri = process.env["CIS2_OIDCJWKS_ENDPOINT"] as string
const cis2JwksClient = jwksClient({
  jwksUri: cis2JwksUri,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 3600000 // 1 hour
})

const cis2OidcConfig: OidcConfig = {
  oidcIssuer: process.env["CIS2_OIDC_ISSUER"] ?? "",
  oidcClientID: process.env["CIS2_OIDC_CLIENT_ID"] ?? "",
  oidcJwksEndpoint: process.env["CIS2_OIDCJWKS_ENDPOINT"] ?? "",
  oidcUserInfoEndpoint: process.env["CIS2_USER_INFO_ENDPOINT"] ?? "",
  userPoolIdp: process.env["CIS2_USER_POOL_IDP"] ?? "",
  jwksClient: cis2JwksClient,
  tokenMappingTableName: process.env["TokenMappingTableName"] ?? ""
}

const mockJwksUri = process.env["MOCK_OIDCJWKS_ENDPOINT"] as string
const mockJwksClient = jwksClient({
  jwksUri: mockJwksUri,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 3600000 // 1 hour
})

const mockOidcConfig: OidcConfig = {
  oidcIssuer: process.env["MOCK_OIDC_ISSUER"] ?? "",
  oidcClientID: process.env["MOCK_OIDC_CLIENT_ID"] ?? "",
  oidcJwksEndpoint: process.env["MOCK_OIDCJWKS_ENDPOINT"] ?? "",
  oidcUserInfoEndpoint: process.env["MOCK_USER_INFO_ENDPOINT"] ?? "",
  userPoolIdp: process.env["MOCK_USER_POOL_IDP"] ?? "",
  jwksClient: mockJwksClient,
  tokenMappingTableName: process.env["TokenMappingTableName"] ?? ""
}

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
  const isMockRequest = MOCK_MODE_ENABLED === "true" && isMockToken

  logger.info("Is this a mock request?", {isMockRequest})

  try {
    // eslint-disable-next-line
    const {cis2AccessToken, cis2IdToken} = await fetchAndVerifyCIS2Tokens(
      event,
      documentClient,
      logger,
      isMockRequest ? mockOidcConfig : cis2OidcConfig
    )

    const userInfoResponse = await fetchUserInfo(
      cis2AccessToken,
      CPT_ACCESS_ACTIVITY_CODES,
      undefined,
      logger,
      isMockRequest ? mockOidcConfig : cis2OidcConfig
    )

    updateDynamoTable(username, userInfoResponse, documentClient, logger, tokenMappingTableName)

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "UserInfo fetched successfully",
        userInfo: userInfoResponse
      })
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Error occurred in Lambda handler", {error: error.message})
    } else {
      logger.error("Unknown error occurred in Lambda handler", {error: String(error)})
    }
    logger.info("trackerUserInfo success!")
    return {
      statusCode: 500,
      body: JSON.stringify({message: "Internal server error"})
    }
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
