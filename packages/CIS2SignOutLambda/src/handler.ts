import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import httpHeaderNormalizer from "@middy/http-header-normalizer"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {getUsernameFromEvent} from "@cpt-ui-common/authFunctions"
import {deleteTokenMapping, deleteSessionManagementRecord} from "@cpt-ui-common/dynamoFunctions"
import {extractInboundEventValues, appendLoggerKeys} from "@cpt-ui-common/lambdaUtils"
const logger = new Logger({serviceName: "CIS2SignOut"})

const dynamoClient = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const MOCK_MODE_ENABLED = process.env["MOCK_MODE_ENABLED"]
const tokenMappingTableName = process.env["TokenMappingTableName"] ?? ""
const sessionManagementTableName = process.env["SessionManagementTableName"] ?? ""

const errorResponseBody = {message: "A system error has occurred"}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const {loggerKeys} = extractInboundEventValues(event)
  appendLoggerKeys(logger, loggerKeys)

  const sessionId = event.requestContext.authorizer?.claims["custom:session_id"]

  // Mock usernames start with "Mock_", and real requests use usernames starting with "Primary_"
  const username = getUsernameFromEvent(event)
  const isMockToken = username.startsWith("Mock_")

  // Determine whether this request should be treated as mock or real.
  if (isMockToken && MOCK_MODE_ENABLED !== "true") {
    logger.error("Trying to use a mock user when mock mode is disabled")
    throw new Error("Trying to use a mock user when mock mode is disabled")
  }

  if (!event.headers["concurrent-session"]) {
    logger.info("Active session logout", sessionId)
    await deleteTokenMapping(documentClient, tokenMappingTableName, username, logger)
  } else {
    logger.info("Concurrent session logout", sessionId)
    await deleteSessionManagementRecord(documentClient, sessionManagementTableName, username, sessionId, logger)
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "CIS2 logout completed"
    })
  }
}

export const handler = middy(lambdaHandler)
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
