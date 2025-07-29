import {MiddlewareObj} from "@middy/core"
import {APIGatewayProxyEventBase, APIGatewayProxyResult} from "aws-lambda"
import {getUsernameFromEvent, getSessionIdFromEvent} from "./event"
import {authenticateRequest, AuthenticateRequestOptions, AuthResult} from "./authenticateRequest"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {Logger} from "@aws-lambda-powertools/logger"
import {AxiosInstance} from "axios"
import {TokenMappingItem, checkTokenMappingForUser, getTokenMapping} from "@cpt-ui-common/dynamoFunctions"

export const authenticationMiddleware = (
  axiosInstance: AxiosInstance,
  ddbClient: DynamoDBDocumentClient,
  authOptions: AuthenticateRequestOptions,
  logger: Logger
) => ({
  before: async (request) => {
    const {event} = request
    const username = getUsernameFromEvent(event)
    const sessionId = getSessionIdFromEvent(event)

    let tokenMappingItem: TokenMappingItem
    let sessionManagementItem: TokenMappingItem | undefined = undefined

    // Capture mapping items from token mapping and session management
    // to ensure we're authenticating the request correctly

    try {
      sessionManagementItem = checkTokenMappingForUser(
        ddbClient,
        authOptions.sessionManagementTableName,
        username,
        logger
      )
    } catch (error) {
      logger.error("Failed to query session management table.", {error})
      throw new Error("Failed to query session management table, \
        will be unable to determine which session instantiated the call.")
    }

    try {
      tokenMappingItem = getTokenMapping(
        ddbClient,
        authOptions.tokenMappingTableName,
        username,
        logger
      )
    } catch (error) {
      logger.error("Failed to query token mapping table.", {error})
      throw new Error("Failed to query token mapping table, \
        will be unable to determine which session instantiated the call.")
    }

    let authResult: AuthResult | null = null

    // Ensure we're dealing with the correct token item, or kill the authentication.
    try {
      if (sessionManagementItem !== null && sessionManagementItem?.sessionId === sessionId) {
        authResult = await authenticateRequest(username, axiosInstance, ddbClient, logger,
          authOptions, authOptions.sessionManagementTableName)
      } else if (tokenMappingItem !== null && tokenMappingItem?.sessionId === sessionId) {
        authResult = await authenticateRequest(username, axiosInstance, ddbClient, logger,
          authOptions, authOptions.tokenMappingTableName)
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
    event.requestContext.authorizer = {...authResult, sessionId}
  }
} satisfies MiddlewareObj<APIGatewayProxyEventBase<AuthResult>, APIGatewayProxyResult, Error>)
