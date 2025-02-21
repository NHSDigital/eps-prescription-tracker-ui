import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

const logger = new Logger({serviceName: "token"})

const errorResponseBody = {
  message: "A system error has occurred"
}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent) => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })
  logger.info("Event payload:", {event})

  const loginEndpoint = process.env["CIS2_IDP_TOKEN_PATH"]
  if (!loginEndpoint) {
    throw new Error("Upstream login endpoint environment variable not set")
  }

  // Build the query parameters including the extra login=prompt parameter.
  const params = new URLSearchParams({
    prompt: "login"
  })

  // Construct the final Cognito hosted login URL.
  const loginUrl = `${loginEndpoint}?${params.toString()}`

  // Return an HTTP 302 redirect response.
  return {
    statusCode: 302,
    headers: {
      Location: loginUrl
    }
  }
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(middyErrorHandler.errorHandler({logger: logger}))
