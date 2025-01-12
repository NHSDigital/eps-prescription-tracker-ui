import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"

import {fetchAndVerifyCIS2Tokens, getUsernameFromEvent} from "./cis2TokenHelpers"
import {fetchUserInfo, updateDynamoTable} from "./userInfoHelpers"
import {mockUserInfo} from "./mockUserInfo"

const logger = new Logger({serviceName: "trackerUserInfo"})

const dynamoClient = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const CPT_ACCESS_ACTIVITY_CODES = ["B0570", "B0278"]

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  const MOCK_MODE_ENABLED = process.env["MOCK_MODE_ENABLED"]

  // Mock usernames start with "Mock_", and real requests use usernames starting with "Primary_"
  const username = getUsernameFromEvent(event)
  const isMockToken = username.startsWith("Mock_")

  // Determine whether this request should be treated as mock or real.
  const isMockRequest = MOCK_MODE_ENABLED === "true" && isMockToken

  logger.info("Is this a mock request?", {isMockRequest})

  // set environment variables
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
    // eslint-disable-next-line
    const {cis2AccessToken, cis2IdToken} = await fetchAndVerifyCIS2Tokens(event, documentClient, logger)

    // Mock user info for testing AEA-4645
    let userInfoResponse
    const username = getUsernameFromEvent(event)

    if (username === "555043304334") {
      userInfoResponse = mockUserInfo()
    } else {
      userInfoResponse = await fetchUserInfo(
        cis2AccessToken,
        CPT_ACCESS_ACTIVITY_CODES,
        undefined,
        logger
      )
    }

    // const userInfoResponse = await fetchUserInfo(
    //   cis2AccessToken,
    //   CPT_ACCESS_ACTIVITY_CODES,
    //   undefined,
    //   logger
    // )

    // const username = getUsernameFromEvent(event)
    updateDynamoTable(username, userInfoResponse, documentClient, logger)

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
