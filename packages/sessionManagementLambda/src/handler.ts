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
import {authenticationMiddleware, authParametersFromEnv} from "@cpt-ui-common/authFunctions"
import axios from "axios"

import {
  getTokenMapping,
  checkTokenMappingForUser,
  updateTokenMapping,
  deleteSessionManagementRecord
} from "@cpt-ui-common/dynamoFunctions"

const logger = new Logger({serviceName: "status"})
const authenticationParameters = authParametersFromEnv()
const tokenMappingTableName = authenticationParameters.tokenMappingTableName
const sessionManagementTableName = authenticationParameters.sessionManagementTableName

const dynamoClient = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true
  }})

const axiosInstance = axios.create()

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

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

  var sanitisedBody = undefined
  if (event.body) {
    try {
      sanitisedBody = JSON.parse(event.body)
    } catch (error) {
      logger.error("Failed to parse request body", {error})
      throw new Error("Failed to parse request body")
    }
  }

  const sessionId = event.requestContext.authorizer?.sessionId
  const username = event.requestContext.authorizer?.username

  // For authorizer request context username fetch token mapping
  const tokenMappingItem = await getTokenMapping(documentClient, tokenMappingTableName, username, logger)
  // Check authorizer session ID == token mapping ID (we are working with active session)

  if (tokenMappingItem && tokenMappingItem.sessionId === sessionId) {
    // We are working with the active session.
    if (sanitisedBody.action === "Clean-Sessions") {
      // Log out of all sessions
    } else {
      return payloadValue({"status": "Active"})
    }
  }

  // Fetch draft session for session ID if one exists
  var sessionManagementItem = await checkTokenMappingForUser(documentClient,
    sessionManagementTableName, username, logger)

  if (sessionManagementItem !== undefined && sessionManagementItem.sessionId === sessionId) {

    switch(sanitisedBody.action) {
      case "Set-Session":
        // Update token mapping to content of draft session for the session ID in request
        // Delete draft session matching session ID

        updateTokenMapping(documentClient, tokenMappingTableName, sessionManagementItem, logger)
        deleteSessionManagementRecord(documentClient, sessionManagementTableName, username, sessionId, logger)
        return payloadValue({"response": "Session set", "status": "Active"}, 202)

      case "Remove-Session":
        // Remove session from draft session table to ensure user isn't presented with option anymore
        if (sessionId === sessionManagementItem.sessionId) {
          logger.info("Current session has an active and draft session record for the same session ID.")
          deleteSessionManagementRecord(documentClient, sessionManagementTableName, username, sessionId, logger)
        }

        return payloadValue({"response": "Session removed", "status": "Expired"})
      default:
        return payloadValue({"response": "No action specified"})
    }
  }

  return {
    statusCode: 500,
    body: JSON.stringify({}),
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    }
  }
}

export const handler = middy(lambdaHandler)
  .use(authenticationMiddleware(axiosInstance, documentClient, authenticationParameters, logger))
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
