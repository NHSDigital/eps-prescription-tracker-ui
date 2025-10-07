import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

/*
 * Expects the following environment variables to be set:
 *
 * COGNITO_CLIENT_ID
 * COGNITO_DOMAIN
 * MOCK_OIDC_ISSUER
 * PRIMARY_OIDC_ISSUER
 *
 */

const logger = new Logger({serviceName: "callbackMock"})
const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

// Environment variables
const fullCognitoDomain = process.env["COGNITO_DOMAIN"] as string

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})

  // Destructure and validate required query parameters
  const {state, code, session_state} = event.queryStringParameters || {}
  if (!state || !code) {
    logger.error(
      "Missing required query parameters: state or code",
      {state, code}
    )
    throw new Error("Missing required query parameters: state or code")
  }
  logger.debug("Incoming query parameters", {state, code, session_state})

  // First, check if this is a pull request redirection
  try {
    const decodedStateString = Buffer.from(state, "base64").toString("utf-8")
    logger.debug("Decoded state string", {decodedStateString})
    const decodedState = JSON.parse(decodedStateString)
    if (decodedState.isPullRequest) {
      const responseParams = {
        state: decodedState.originalState,
        session_state: session_state || "",
        code
      }
      const baseRedirectUri = decodedState.redirectUri
      const redirectUri = `${baseRedirectUri}?${new URLSearchParams(responseParams).toString()}`
      logger.debug(`return redirect to ${redirectUri}`, {baseRedirectUri, responseParams})
      return {
        statusCode: 302,
        headers: {Location: redirectUri},
        isBase64Encoded: false,
        body: JSON.stringify({})
      }
    }
  } catch (decodeError) {
    logger.warn("Could not base64 decode state", {error: decodeError})
    // Continue with regular flow
  }

  // Build response parameters for redirection
  const responseParams = {
    state,
    session_state: session_state || "",
    code
  }

  const redirectUri = `https://${fullCognitoDomain}/oauth2/idpresponse` +
    `?${new URLSearchParams(responseParams).toString()}`

  logger.info("Redirecting to Cognito", {redirectUri})

  return {
    statusCode: 302,
    headers: {Location: redirectUri},
    isBase64Encoded: false,
    body: JSON.stringify({})
  }
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(
    inputOutputLogger({
      logger: (request) => logger.info(request)
    })
  )
  .use(middyErrorHandler.errorHandler({logger}))
