// import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
// import {Logger} from "@aws-lambda-powertools/logger"
// import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
// import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
// import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
// import middy from "@middy/core"
// import inputOutputLogger from "@middy/input-output-logger"
// import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
// import {getUsernameFromEvent, fetchAndVerifyCIS2Tokens, initializeOidcConfig} from "@cpt-ui-common/authFunctions"
// import {fetchUserInfo, updateDynamoTable} from "./userInfoHelpers"

// /*
// This is the lambda code to get user info
// It expects the following environment variables to be set

// CIS2_OIDC_ISSUER
// CIS2_OIDC_CLIENT_ID
// CIS2_OIDCJWKS_ENDPOINT
// CIS2_USER_INFO_ENDPOINT
// CIS2_USER_POOL_IDP

// TokenMappingTableName
// MOCK_MODE_ENABLED

// For mock calls, the following must be set
// MOCK_OIDC_ISSUER
// MOCK_OIDC_CLIENT_ID
// MOCK_OIDCJWKS_ENDPOINT
// MOCK_USER_INFO_ENDPOINT
// MOCK_USER_POOL_IDP
// */
// const logger = new Logger({serviceName: "trackerUserInfo"})

// const dynamoClient = new DynamoDBClient({})
// const documentClient = DynamoDBDocumentClient.from(dynamoClient)

// // Create a config for cis2 and mock
// // this is outside functions so it can be re-used and caching works
// const {mockOidcConfig, cis2OidcConfig} = initializeOidcConfig()

// const MOCK_MODE_ENABLED = process.env["MOCK_MODE_ENABLED"]
// const tokenMappingTableName = process.env["TokenMappingTableName"] ?? ""

// const errorResponseBody = {
//   message: "A system error has occurred"
// }

// const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

// const CPT_ACCESS_ACTIVITY_CODES = ["B0570", "B0278"]

// const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
//   logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
//   logger.info("Lambda handler invoked", {event})

//   // Mock usernames start with "Mock_", and real requests use usernames starting with "Primary_"
//   const username = getUsernameFromEvent(event)
//   const isMockToken = username.startsWith("Mock_")

//   // Determine whether this request should be treated as mock or real.
//   if (isMockToken && MOCK_MODE_ENABLED !== "true") {
//     throw new Error("Trying to use a mock user when mock mode is disabled")
//   }

//   const isMockRequest = MOCK_MODE_ENABLED === "true" && isMockToken

//   logger.info("Is this a mock request?", {isMockRequest})

//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   const {cis2AccessToken, cis2IdToken} = await fetchAndVerifyCIS2Tokens(
//     event,
//     documentClient,
//     logger,
//     isMockRequest ? mockOidcConfig : cis2OidcConfig
//   )

//   const userInfoResponse = await fetchUserInfo(
//     cis2AccessToken,
//     CPT_ACCESS_ACTIVITY_CODES,
//     undefined,
//     logger,
//     isMockRequest ? mockOidcConfig : cis2OidcConfig
//   )

//   updateDynamoTable(username, userInfoResponse, documentClient, logger, tokenMappingTableName)

//   try {
//     // eslint-disable-next-line
//     const {cis2AccessToken, cis2IdToken} = await fetchAndVerifyCIS2Tokens(event, documentClient, logger)

//     const userInfoResponse = await fetchUserInfo(
//       cis2AccessToken,
//       CPT_ACCESS_ACTIVITY_CODES,
//       undefined,
//       logger
//     )

//     // const username = getUsernameFromEvent(event)
//     // Mock user name for testing AEA-4645
//     const username = "Mock_555043304334"
//     updateDynamoTable(username, userInfoResponse, documentClient, logger)

//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         message: "UserInfo fetched successfully",
//         userInfo: userInfoResponse
//       })
//     }
//   } catch (error) {
//     if (error instanceof Error) {
//       logger.error("Error occurred in Lambda handler", {error: error.message})
//     } else {
//       logger.error("Unknown error occurred in Lambda handler", {error: String(error)})
//     }
//     logger.info("trackerUserInfo success!")
//     return {
//       statusCode: 500,
//       body: JSON.stringify({message: "Internal server error"})
//     }
//   }

// }

// export const handler = middy(lambdaHandler)
//   .use(injectLambdaContext(logger, {clearState: true}))
//   .use(
//     inputOutputLogger({
//       logger: (request) => {
//         logger.info(request)
//       }
//     })
//   )
//   .use(middyErrorHandler.errorHandler({logger: logger}))
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {getUsernameFromEvent, fetchAndVerifyCIS2Tokens, initializeOidcConfig} from "@cpt-ui-common/authFunctions"
import {fetchUserInfo, updateDynamoTable} from "./userInfoHelpers"

/*
This is the lambda code to get user info.
It expects the following environment variables to be set:

CIS2_OIDC_ISSUER
CIS2_OIDC_CLIENT_ID
CIS2_OIDCJWKS_ENDPOINT
CIS2_USER_INFO_ENDPOINT
CIS2_USER_POOL_IDP

TokenMappingTableName
MOCK_MODE_ENABLED

For mock calls, the following must be set:
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
// This is outside functions so it can be re-used and caching works
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

  const username = getUsernameFromEvent(event)
  const isMockToken = username.startsWith("Mock_")

  if (isMockToken && MOCK_MODE_ENABLED !== "true") {
    throw new Error("Trying to use a mock user when mock mode is disabled")
  }

  const isMockRequest = MOCK_MODE_ENABLED === "true" && isMockToken

  logger.info("Is this a mock request?", {isMockRequest})

  // Set environment variables based on mock or real request
  process.env.idpTokenPath = isMockRequest
    ? process.env.MOCK_IDP_TOKEN_PATH
    : process.env.REAL_IDP_TOKEN_PATH

  process.env.userInfoEndpoint = isMockRequest
    ? process.env.MOCK_USER_INFO_ENDPOINT
    : process.env.REAL_USER_INFO_ENDPOINT
  process.env.oidcjwksEndpoint = isMockRequest
    ? process.env.MOCK_OIDCJWKS_ENDPOINT
    : process.env.REAL_OIDCJWKS_ENDPOINT

  process.env.jwtPrivateKeyArn = isMockRequest
    ? process.env.MOCK_JWT_PRIVATE_KEY_ARN
    : process.env.REAL_JWT_PRIVATE_KEY_ARN
  process.env.userPoolIdp = isMockRequest
    ? process.env.MOCK_USER_POOL_IDP
    : process.env.REAL_USER_POOL_IDP
  process.env.useSignedJWT = isMockRequest
    ? process.env.MOCK_USE_SIGNED_JWT
    : process.env.REAL_USE_SIGNED_JWT
  process.env.oidcClientId = isMockRequest
    ? process.env.MOCK_OIDC_CLIENT_ID
    : process.env.REAL_OIDC_CLIENT_ID
  process.env.oidcIssuer = isMockRequest
    ? process.env.MOCK_OIDC_ISSUER
    : process.env.REAL_OIDC_ISSUER

  try {
    const {cis2AccessToken} = await fetchAndVerifyCIS2Tokens(
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
  .use(middyErrorHandler.errorHandler({logger}))
