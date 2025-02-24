import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyEventQueryStringParameters} from "aws-lambda"
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

function toQueryString(params: APIGatewayProxyEventQueryStringParameters): string {
  // Returns the stringified parameters. Does NOT include the leading `?`
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, value)
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `${queryString}` : ""
}

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
  const queryStringParameters = event.queryStringParameters || {}
  queryStringParameters["prompt"] = "login"
  // queryStringParameters["redirect_uri"] = `https://${props.fullCloudfrontDomain}/api/callback`

  // TODO: We may also need to create a new client_id here, re-generate the state, and cache it for the return journey.

  // Set the redirection URL header
  const loginUrl = `${loginAddress}?${toQueryString(queryStringParameters)}`

  // Return an HTTP 302 redirect response.
  const redirect = {
    statusCode: 302,
    headers: {Location: loginUrl}
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
