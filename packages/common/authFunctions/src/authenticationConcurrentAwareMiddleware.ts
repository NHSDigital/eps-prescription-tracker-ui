import {MiddlewareObj} from "@middy/core"
import {APIGatewayProxyEventBase, APIGatewayProxyResult} from "aws-lambda"
import {getUsernameFromEvent, getSessionIdFromEvent} from "./event"
import {authenticateRequest, AuthenticateRequestOptions, AuthResult} from "./authenticateRequest"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {Logger} from "@aws-lambda-powertools/logger"
import {AxiosInstance} from "axios"
import {TokenMappingItem, tryGetTokenMapping} from "@cpt-ui-common/dynamoFunctions"

export const authenticationConcurrentAwareMiddleware = (
  axiosInstance: AxiosInstance,
  ddbClient: DynamoDBDocumentClient,
  authOptions: AuthenticateRequestOptions,
  logger: Logger,
  disableTokenRefresh: boolean = false
) => ({
  before: async (request) => {
    const {event} = request

    try {
      const username = getUsernameFromEvent(event)
      const sessionId = getSessionIdFromEvent(event)

      let sessionManagementItem: TokenMappingItem | undefined = undefined
      let tokenMappingItem: TokenMappingItem | undefined = undefined

      // Capture sessionManagement item to determine if the sessionId is concurrent session
      logger.info("Using concurrent aware authentication middleware")
      sessionManagementItem = await tryGetTokenMapping(
        ddbClient,
        authOptions.sessionManagementTableName,
        username,
        logger
      )

      tokenMappingItem = await tryGetTokenMapping(
        ddbClient,
        authOptions.tokenMappingTableName,
        username,
        logger
      )

      const sessionManagementSessionId = sessionManagementItem?.sessionId
      const tokenMappingSessionId = tokenMappingItem?.sessionId

      let authResult: AuthResult | null = null
      let isConcurrentSession: boolean = false

      // Ensure we're dealing with the correct token item, or kill the authentication.
      try {
        if (sessionManagementItem !== undefined && sessionManagementSessionId === sessionId) {
          logger.debug("Session ID matches the session management item, proceeding with authentication")
          isConcurrentSession = true
          authResult = await authenticateRequest(username, axiosInstance, ddbClient, logger,
            authOptions, sessionManagementItem, authOptions.sessionManagementTableName, disableTokenRefresh)

        } else if (tokenMappingItem !== undefined && tokenMappingSessionId === sessionId) {
          logger.debug("Session ID matches the token mapping item, proceeding with authentication")
          isConcurrentSession = false
          authResult = await authenticateRequest(username, axiosInstance, ddbClient, logger,
            authOptions, tokenMappingItem, authOptions.tokenMappingTableName, disableTokenRefresh)

        } else {
          logger.error("Request token doesn't match any sessionId in the token mapping or session management table, \
          treating as invalid session", {tokenMappingSessionId, sessionManagementSessionId})
        }
      } catch (error) {
        logger.error("Authentication failed returning restart login prompt", {error})
      }

      if (!authResult) {
        request.earlyResponse = {
          statusCode: 401,
          body: JSON.stringify({
            message: "Session expired or invalid. Please log in again.",
            restartLogin: true
          })
        }
        return request.earlyResponse
      }
      event.requestContext.authorizer = {...authResult, sessionId, isConcurrentSession}
    } catch (error) {
      logger.error("Authentication failed returning restart login prompt", {error})
      request.earlyResponse = {
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true
        })
      }
      return request.earlyResponse
    }
  }
} satisfies MiddlewareObj<APIGatewayProxyEventBase<AuthResult>, APIGatewayProxyResult, Error>)
