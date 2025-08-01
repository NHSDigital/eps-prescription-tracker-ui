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

import {
  deleteRecordAllowFailures
} from "@cpt-ui-common/dynamoFunctions"

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
const tokenMappingTableName = process.env["TOKEN_MAPPING_TABLE_NAME"] as string
const sessionManagementTableName = process.env["SESSION_MANAGEMENT_TABLE_NAME"] as string

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

  const body = JSON.parse(event.body)
  const username = body.username

  try {
    deleteRecordAllowFailures(documentClient, tokenMappingTableName, username, logger)
    deleteRecordAllowFailures(documentClient, sessionManagementTableName, username, logger)
  } catch (error) {
    logger.error("Error attempting to delete an item.", {username, error})
  }

  payloadValue({"message": "Success"})

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
