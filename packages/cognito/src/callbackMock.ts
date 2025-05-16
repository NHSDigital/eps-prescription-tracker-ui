import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

/*
 * Expects the following environment variables to be set:
 *
 * StateMappingTableName
 * COGNITO_CLIENT_ID
 * COGNITO_DOMAIN
 * MOCK_OIDC_ISSUER
 * PRIMARY_OIDC_ISSUER
 *
 */

const logger = new Logger({serviceName: "idp-response"})
const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

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

  // see if we need to redirect for a pull request
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

  } catch (error) {
    logger.warn("Could not base64 decode state", {error})
  }
  throw new Error("Not implemented")
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(
    inputOutputLogger({
      logger: (request) => logger.info(request)
    })
  )
  .use(middyErrorHandler.errorHandler({logger}))
