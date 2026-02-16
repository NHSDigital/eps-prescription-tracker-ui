import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import httpHeaderNormalizer from "@middy/http-header-normalizer"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {injectCorrelationLoggerMiddleware} from "@cpt-ui-common/lambdaUtils"

import {deleteRecordAllowFailures} from "@cpt-ui-common/dynamoFunctions"

const logger = new Logger({serviceName: "status"})
const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true
  }})

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

// Env vars
const tokenMappingTableName = process.env["TokenMappingTableName"] as string
const sessionManagementTableName = process.env["SessionManagementTableName"] as string

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  const body = JSON.parse(event.body? event.body : "{}")

  if (!body || !body.username) {
    logger.error("Invalid request body", {body})
    return {
      statusCode: 400,
      body: JSON.stringify({"message": "Invalid request body"}),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    }
  }
  const username = body.username
  const requestId = body.request_id

  logger.info("Deleting token mapping and session management data "
    + "for user with timeout simulation", {username, requestId})

  const results = await Promise.allSettled([
    deleteRecordAllowFailures(documentClient, tokenMappingTableName, username, logger),
    deleteRecordAllowFailures(documentClient, sessionManagementTableName, username, logger)
  ])

  for (const result of results) {
    if (result.status === "rejected") {
      throw result.reason
    }
  }

  logger.info("Successfully conducted deletions and simulating timeout for user", {username, requestId})
  
  // Return 401 with timeout cause - this will trigger handleRestartLogin with "Timeout"
  return {
    statusCode: 401,
    body: JSON.stringify({
      "message": "Session expired or invalid. Please log in again.",
      "restartLogin": true,
      "invalidSessionCause": "Timeout"
    }),
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    }
  }
}

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
  .use(middyErrorHandler.errorHandler({logger: logger}))
