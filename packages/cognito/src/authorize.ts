import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

/*
 * Expects the following environment variables to be set:
 * IDP_AUTHORIZE_PATH  -> This is the upstream auth provider - in this case CIS2
 */

// Environment variables
const authorizeEndpoint = process.env["IDP_AUTHORIZE_PATH"] as string

const logger = new Logger({serviceName: "authorize"})
const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})

  const queryParams = event.queryStringParameters || {}

  // Build the redirect parameters for CIS2
  const responseParameters = {
    ...queryParams,
    prompt: "login"
  }

  // This is the CIS2 URL we are pointing the client towards
  const redirectPath = `${authorizeEndpoint}?${new URLSearchParams(responseParameters)}`

  return {
    statusCode: 302,
    headers: {Location: redirectPath},
    isBase64Encoded: false,
    body: ""
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
