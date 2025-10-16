import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {buildCallbackRedirect} from "./helpers"

/*
 * Expects the following environment variables to be set:
 *
 * COGNITO_CLIENT_ID
 * COGNITO_DOMAIN
 * PRIMARY_OIDC_ISSUER
 *
 */

const logger = new Logger({serviceName: "callback"})
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
      "Missing required query parameters: state, code, or session_state",
      {state, code}
    )
    throw new Error("Missing required query parameters: state, code, or session_state")
  }
  logger.info("Incoming query parameters", {state, code})

  return buildCallbackRedirect(logger, state, code, session_state, fullCognitoDomain)
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(
    inputOutputLogger({
      logger: (request) => logger.info(request)
    })
  )
  .use(middyErrorHandler.errorHandler({logger}))
