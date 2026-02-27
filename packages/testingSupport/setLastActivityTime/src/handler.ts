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

import {getTokenMapping, updateTokenMapping} from "@cpt-ui-common/dynamoFunctions"

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

const tokenMappingTableName = process.env["TokenMappingTableName"] as string

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  try {
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
    const minutes = body.minutes ?? 13 // Default to 13 minutes if not provided

    // Validate minutes parameter
    if (typeof minutes !== "number" || minutes < 0 || !Number.isFinite(minutes)) {
      logger.error("Invalid minutes parameter", {minutes, username, requestId})
      return {
        statusCode: 400,
        body: JSON.stringify({"message": "Invalid minutes parameter. Must be a positive number."}),
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        }
      }
    }

    logger.info("Setting lastActivityTime to specified minutes in the past for user", {username, requestId, minutes})

    const timeInPast = Date.now() - (minutes * 60 * 1000)

    const existingTokenMapping = await getTokenMapping(
      documentClient,
      tokenMappingTableName,
      username,
      logger
    )

    if (existingTokenMapping) {
      await updateTokenMapping(
        documentClient,
        tokenMappingTableName,
        {
          username,
          lastActivityTime: timeInPast
        },
        logger
      )

      logger.info("Successfully updated lastActivityTime for regression testing", {
        username,
        requestId,
        minutes,
        newLastActivityTime: timeInPast
      })

      return {
        statusCode: 200,
        body: JSON.stringify({}),
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        }
      }
    } else {
      logger.error("No existing token mapping found for user", {username})
      return {
        statusCode: 404,
        body: JSON.stringify({"message": "No active session found for user"}),
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        }
      }
    }
  } catch (error) {
    // Handle JSON parsing errors and other errors
    if (error instanceof SyntaxError) {
      logger.error("Invalid JSON in request body", {error: error.message, body: event.body})
      return {
        statusCode: 400,
        body: JSON.stringify({"message": "Invalid JSON in request body"}),
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        }
      }
    }

    let username: string | undefined
    let requestId: string | undefined
    try {
      const parsedBody = JSON.parse(event.body || "{}")
      username = parsedBody?.username
      requestId = parsedBody?.request_id
    } catch {
      // Ignore parsing errors for logging purposes
    }

    logger.error("Error updating lastActivityTime", {error, username, requestId})
    return {
      statusCode: 500,
      body: JSON.stringify({"message": "Error updating session timeout"}),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
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
