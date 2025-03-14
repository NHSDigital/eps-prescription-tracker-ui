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
  if (!state || !code || !session_state) {
    logger.error(
      "Missing required query parameters: state, code, or session_state",
      {state, code, session_state}
    )
    throw new Error("Missing required query parameters: state, code, or session_state")
  }
  logger.info("Incoming query parameters", {state, code, session_state})

  // see if we need to redirect for a pull request
  try {
    const decodedStateString = Buffer.from(state, "base64").toString("utf-8")
    const decodedState = JSON.parse(decodedStateString)
    if (decodedState.isPullRequest) {
      const responseParams = {
        state,
        session_state,
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    logger.warn("Could not base64 decode state")
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
