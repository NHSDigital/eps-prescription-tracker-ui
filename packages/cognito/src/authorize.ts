import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

/*
 * Expects the following environment variables to be set:
 *
 *
 * IDP_AUTHORIZE_PATH  -> This is the upstream auth provider - in this case CIS2
 * OIDC_CLIENT_ID
 * COGNITO_CLIENT_ID
 *
 * FULL_CLOUDFRONT_DOMAIN
 *
 */

// Environment variables
const authorizeEndpoint = process.env["IDP_AUTHORIZE_PATH"] as string
const cis2ClientId = process.env["OIDC_CLIENT_ID"] as string
const userPoolClientId = process.env["COGNITO_CLIENT_ID"] as string
const cloudfrontDomain = process.env["FULL_CLOUDFRONT_DOMAIN"] as string

const logger = new Logger({serviceName: "authorize"})
const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.debug("Environment variable", {env: {
    authorizeEndpoint,
    cis2ClientId,
    userPoolClientId,
    cloudfrontDomain
  }})

  // Validate required environment variables
  if (!authorizeEndpoint) throw new Error("Authorize endpoint environment variable not set")
  if (!cloudfrontDomain) throw new Error("Cloudfront domain environment variable not set")
  if (!userPoolClientId) throw new Error("Cognito user pool client ID environment variable not set")
  if (!cis2ClientId) throw new Error("OIDC client ID environment variable not set")

  const queryParams = event.queryStringParameters || {}

  // Validate client_id from the query parameters
  if (queryParams.client_id !== cis2ClientId) {
    throw new Error(
      `Mismatch in OIDC client ID. Payload: ${queryParams.client_id} | Expected: ${userPoolClientId}`
    )
  }

  // Update the scope to the CIS2 scopes
  queryParams.scope = "openid profile nhsperson nationalrbacaccess associatedorgs"

  // Ensure the state parameter is provided
  const state = queryParams.state
  if (!state) throw new Error("Missing state parameter")

  // Build the callback URI for redirection
  const callbackUri = `https://${cloudfrontDomain}/oauth2/callback`

  // Build the redirect parameters for CIS2
  const responseParameters = {
    response_type: queryParams.response_type as string,
    scope: queryParams.scope as string,
    client_id: cis2ClientId,
    state,
    redirect_uri: callbackUri,
    prompt: "login"
  }

  // This is the CIS2 URL we are pointing the client towards
  const redirectPath = `${authorizeEndpoint}?${new URLSearchParams(responseParameters)}`

  return {
    statusCode: 302,
    headers: {Location: redirectPath},
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
