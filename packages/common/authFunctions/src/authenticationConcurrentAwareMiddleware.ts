import {MiddlewareObj} from "@middy/core"
import {APIGatewayProxyEventBase, APIGatewayProxyResult} from "aws-lambda"
import {getUsernameFromEvent, getSessionIdFromEvent} from "./event"
import {
  authenticateRequest,
  AuthDependencies,
  AuthResult,
  AuthTimeoutResult
} from "./authenticateRequest"
import {TokenMappingItem, tryGetTokenMapping} from "@cpt-ui-common/dynamoFunctions"

export const authenticationConcurrentAwareMiddleware = (
  {
    axiosInstance,
    ddbClient,
    authOptions,
    logger
  }: AuthDependencies,
  disableTokenRefresh: boolean = false
) => ({
  before: async (request) => {
    const {event} = request

    let invalidSessionCause: string | undefined = undefined
    let authenticatedResult: AuthResult | AuthTimeoutResult | null = null

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

      let isConcurrentSession: boolean = false

      // Ensure we're dealing with the correct token item, or kill the authentication.
      if (sessionManagementItem !== undefined && sessionManagementSessionId === sessionId) {
        logger.debug("Session ID matches the session management item, proceeding with authentication")
        isConcurrentSession = true
        authenticatedResult = await authenticateRequest(
          username,
          {axiosInstance, ddbClient, logger, authOptions},
          sessionManagementItem,
          authOptions.sessionManagementTableName,
          disableTokenRefresh
        )
      } else if (tokenMappingItem !== undefined && tokenMappingSessionId === sessionId) {
        logger.debug("Session ID matches the token mapping item, proceeding with authentication")
        isConcurrentSession = false
        authenticatedResult = await authenticateRequest(
          username,
          {axiosInstance, ddbClient, logger, authOptions},
          tokenMappingItem,
          authOptions.tokenMappingTableName,
          disableTokenRefresh
        )
      } else if (tokenMappingItem !== undefined) {
        logger.info("A session is active but does not match the requestors sessionId", {username, sessionId})
        invalidSessionCause = "ConcurrentSession"
      } else {
        logger.error("Request token invalid. No matching session found.", {
          tokenMappingSessionId,
          sessionManagementSessionId
        })
        invalidSessionCause = "InvalidSession"
      }

      //check why this needs isconcurrentsession
      if (authenticatedResult && !("isTimeout" in authenticatedResult)) {
        event.requestContext.authorizer = {...(authenticatedResult as AuthResult), sessionId, isConcurrentSession}
      }
    } catch (error) {
      logger.error("Authentication failed returning restart login prompt", {error})
    }

    if (!authenticatedResult || ("isTimeout" in authenticatedResult && authenticatedResult.isTimeout)) {
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
  }
} satisfies MiddlewareObj<APIGatewayProxyEventBase<AuthResult>, APIGatewayProxyResult, Error>)
