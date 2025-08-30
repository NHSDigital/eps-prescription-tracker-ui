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
import {authenticationConcurrentAwareMiddleware, authParametersFromEnv} from "@cpt-ui-common/authFunctions"
import axios from "axios"

import {tryGetTokenMapping, updateTokenMapping, deleteTokenMapping} from "@cpt-ui-common/dynamoFunctions"

const logger = new Logger({serviceName: "sesssion-management"})
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

  if (sessionId === undefined || username === undefined) {
    logger.error("Session ID or Username is undefined", {sessionId, username})
    throw new Error("Session ID or Username is undefined")
  }

  // Fetch draft session for session ID if one exists
  var sessionManagementItem = await tryGetTokenMapping(documentClient,
    sessionManagementTableName, username, logger)

  if (sessionManagementItem !== undefined && sessionManagementItem.sessionId === sessionId) {

    switch(sanitisedBody.action) {
      case "Set-Session":
        // Update token mapping to content of draft session for the session ID in request
        // Delete draft session matching username - to ensure no 'concurrent' sessions exist
        await updateTokenMapping(documentClient, tokenMappingTableName, sessionManagementItem, logger)
        await deleteTokenMapping(documentClient, sessionManagementTableName, username, logger)
        return payloadValue({"message": "Session set", "status": "Active"}, 202)

      default:
        return payloadValue({"message": "No action specified"}, 500)
    }
  }

  logger.error("Request doesn't match an action case, or session ID doesn't match an item in sessionManagement table.")
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
  .use(authenticationConcurrentAwareMiddleware(axiosInstance, documentClient, authenticationParameters, logger))
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
