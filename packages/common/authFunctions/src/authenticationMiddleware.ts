import {MiddlewareObj} from "@middy/core"
import {APIGatewayProxyEventBase, APIGatewayProxyResult} from "aws-lambda"
import {getUsernameFromEvent, getSessionIdFromEvent} from "./event"
import {authenticateRequest, AuthDependencies, AuthResult} from "./authenticateRequest"
import {getTokenMapping, TokenMappingItem} from "@cpt-ui-common/dynamoFunctions"

export const authenticationMiddleware = ({
  axiosInstance,
  ddbClient,
  authOptions,
  logger
}: AuthDependencies) => ({
  before: async (request) => {
    const {event} = request

    logger.info("Using standard authentication middleware")

    let invalidSessionCause: string | undefined = undefined
    let authResult: AuthResult | null = null

    try {
      const username = getUsernameFromEvent(event)
      const sessionId = getSessionIdFromEvent(event)
      // Fetch the token mapping item for the user
      const tokenMappingItem: TokenMappingItem = await getTokenMapping(
        ddbClient,
        authOptions.tokenMappingTableName,
        username,
        logger
      )

      const tokenMappingSessionId = tokenMappingItem?.sessionId

      if (tokenMappingItem !== undefined && tokenMappingSessionId === sessionId) {
        // Feed the token mapping item to authenticateRequest
        logger.info("Session ID matches the token mapping item, proceeding with authentication")
        authResult = await authenticateRequest(
          username,
          {axiosInstance, ddbClient, logger, authOptions},
          tokenMappingItem,
          authOptions.tokenMappingTableName,
          false
        )
      } else if (tokenMappingItem !== undefined) {
        logger.info("A session is active but does not match the requestors sessionId", {username, sessionId})
        invalidSessionCause = "ConcurrentSession"
      } else {
        logger.error("Request token invalid. No matching session found.", {
          tokenMappingSessionId
        })
        invalidSessionCause = "InvalidSession"
      }
    } catch (error) {
      logger.error("Authentication failed returning restart login prompt", {error})
    }
    if (!authResult) {
      request.earlyResponse = {
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true,
          ...(invalidSessionCause && {invalidSessionCause})
        })
      }
      return request.earlyResponse
    }
    event.requestContext.authorizer = authResult
  }
} satisfies MiddlewareObj<APIGatewayProxyEventBase<AuthResult>, APIGatewayProxyResult, Error>)
