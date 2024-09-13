import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import errorHandler from "@nhs/fhir-middy-error-handler"

const logger = new Logger({serviceName: "status"})

/* eslint-disable  max-len */

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} _event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext.requestId
  })

  const pathParams = event.queryStringParameters
  if (pathParams===null) {
    throw new Error("can not get params")
  }

  const filteredParams: Record<string, string> = Object.keys(pathParams)
    .filter(key => pathParams[key] !== null && pathParams[key] !== undefined)
    .reduce((acc, key) => {
      acc[key] = pathParams[key] as string // Safely cast after filtering
      return acc
    }, {} satisfies Record<string, string>)

  const cognito_redirect_url = process.env["cognito_idp_response_uri"] + "?" + new URLSearchParams(filteredParams)

  return {
    statusCode: 302,
    body: JSON.stringify(event.body),
    headers: {
      "Location": cognito_redirect_url
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
  .use(errorHandler({logger: logger}))
