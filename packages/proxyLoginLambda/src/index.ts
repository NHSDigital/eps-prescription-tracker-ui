import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

const logger = new Logger({serviceName: "authorize"})

const errorResponseBody = {
  message: "A system error has occurred"
}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const loginAddress = process.env["CIS2_IDP_TOKEN_PATH"] as string

const lambdaHandler = async (event: APIGatewayProxyEvent) => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })
  logger.info("Event payload:", {event})

  // This is set to mock for the mock lambda, and set to CIS2 for the prod lambda
  const loginEndpoint = process.env["CIS2_IDP_TOKEN_PATH"]
  if (!loginEndpoint) {
    throw new Error("Upstream login endpoint environment variable not set")
  }

  // Build the query parameters including the extra login=prompt parameter.
  const params = event["queryStringParameters"] || {}
  params["prompt"] = "login"

  // Set the redirection URL header
  const loginUrl = `${loginAddress}?${params.toString()}`
  const headers = event["headers"]
  headers["Location"] = loginUrl

  logger.info("Headers and parameters:", {headers, params})

  // Return an HTTP 302 redirect response.
  const redirect = {
    ...event, // TODO: Is this necessary, slash does it work? Or will this not behave how I think...
    statusCode: 302,
    // FIXME: I dont think we need this, but leaving it to remind me later. Check: does the login event carry a body?
    // body: json.dumps({}),
    headers
  }
  logger.info("Redirect response", {redirect})
  return redirect
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
