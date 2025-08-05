import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import httpHeaderNormalizer from "@middy/http-header-normalizer"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {extractInboundEventValues, appendLoggerKeys} from "@cpt-ui-common/lambdaUtils"

import {deleteRecordAllowFailures} from "@cpt-ui-common/dynamoFunctions"

const logger = new Logger({serviceName: "status"})
const dynamoClient = new DynamoDBClient({})
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

function payloadValue(
  body: object,
  statusCode: number = 200,
  headers={
    "Content-Type": "application/json",
    "Cache-Control": "no-cache"
  }): APIGatewayProxyResult {
  return {
    statusCode: statusCode,
    body: JSON.stringify(body),
    headers: headers
  }
}

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const {loggerKeys} = extractInboundEventValues(event)
  appendLoggerKeys(logger, loggerKeys)

  const body = JSON.parse(event.body? event.body : "{}")

  if (!body || !body.username) {
    logger.error("Invalid request body", {body})
    return payloadValue({"message": "Invalid request body"}, 400)
  }
  const username = body.username

  try {
    logger.info("Deleting token mapping and session management data for user", {username})
    await deleteRecordAllowFailures(documentClient, tokenMappingTableName, username, logger)
    await deleteRecordAllowFailures(documentClient, sessionManagementTableName, username, logger)
    logger.info("Successfully deleted token mapping and session state for user", {username})
    return payloadValue({"message": "Success"})
  } catch (error) {
    logger.error("Error attempting to delete an item.", {username, error})
  }

  // If we reach here, something went wrong
  logger.error("An error occurred while processing the request", {username})

  return {
    statusCode: 500,
    body: JSON.stringify({"message": "A system error has occurred"}),
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    }
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
