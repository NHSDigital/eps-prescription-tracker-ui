import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import errorHandler from "@nhs/fhir-middy-error-handler"
import axios, {AxiosResponseHeaders, RawAxiosResponseHeaders} from "axios"
import {parse, stringify} from "querystring"

const logger = new Logger({serviceName: "status"})

/* eslint-disable  max-len */

/**
 *
 * adapted from https://github.com/aws-samples/cognito-external-idp-proxy/blob/main/lambda/token/token_flow.py
 *
 */

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext.requestId
  })
  const idp_token_path = process.env["idp_token_path"] as string
  const body = event.body
  if (body===null) {
    throw new Error("can not get body")
  }
  const object_body = parse(body)

  // change the redirect uri to be our callback lambda
  object_body["redirect_uri"] = process.env["ResponseUri"] as string

  // TODO create a signed JWT and add it to the request

  const axiosInstance = axios.create()

  logger.info("about to call downstream idp with rewritten body", {idp_token_path, body: object_body})

  const response = await axiosInstance.post(idp_token_path,
    stringify(object_body)
  )

  // TODO we should store the response so we can use the tokens returned by CIS2 in an apigee token exchange
  logger.info("response from external oidc", {data: response.data})

  // return status code and body from request to downstream idp
  return {
    statusCode: response.status,
    body: JSON.stringify(response.data),
    headers: formatHeaders(response.headers)
  }
}

const formatHeaders = (headers: AxiosResponseHeaders | Partial<RawAxiosResponseHeaders>): { [header: string]: string } => {
  const formattedHeaders: { [header: string]: string } = {}

  // Iterate through the Axios headers and ensure values are stringified
  for (const [key, value] of Object.entries(headers)) {
    formattedHeaders[key] = String(value) // Ensure each value is converted to string
  }

  return formattedHeaders
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
