import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

/*
 * Expects the following environment variables to be set:
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
const apigeeApiKeyArn = process.env["APIGEE_API_KEY_ARN"] as string

const logger = new Logger({serviceName: "authorize"})
const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const apigeeApiKey = await getSecret(apigeeApiKeyArn)
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  // we need to use the base domain for the environment so that pull requests go to that callback uri
  // as we can only have one callback uri per apigee application
  const baseEnvironmentDomain = cloudfrontDomain.replace(/-pr-(\d*)/, "")

  logger.debug("Environment variable", {env: {
    authorizeEndpoint,
    baseEnvironmentDomain,
    cis2ClientId,
    userPoolClientId,
    cloudfrontDomain,
    apigeeApiKeyArn
  }})

  // Validate required environment variables
  if (!authorizeEndpoint) throw new Error("Authorize endpoint environment variable not set")
  if (!cloudfrontDomain) throw new Error("Cloudfront domain environment variable not set")
  if (!userPoolClientId) throw new Error("Cognito user pool client ID environment variable not set")
  if (!cis2ClientId) throw new Error("OIDC client ID environment variable not set")
  if (!apigeeApiKey) throw new Error("apigee api key environment variable not set")

  const queryParams = event.queryStringParameters || {}

  // Validate client_id from the query parameters
  if (queryParams.client_id !== cis2ClientId) {
    throw new Error(
      `Mismatch in OIDC client ID. Payload: ${queryParams.client_id} | Expected: ${userPoolClientId}`
    )
  }

  // Ensure the state parameter is provided
  const originalState = queryParams.state
  if (!originalState) throw new Error("Missing state parameter")

  // Build the callback URI for redirection
  // for pull requests we pack the real callback url for this pull request into the state
  // the callback lambda then decodes this and redirects to the callback url for this pull request
  const realCallbackUri = `https://${cloudfrontDomain}/oauth2/mock-callback`
  const callbackUri = `https://${baseEnvironmentDomain}/oauth2/mock-callback`

  const newStateJson = {
    isPullRequest: true,
    redirectUri: realCallbackUri,
    originalState
  }
  const newState = Buffer.from(JSON.stringify(newStateJson)).toString("base64")

  // Build the redirect parameters for CIS2
  const responseParameters = {
    redirect_uri: callbackUri,
    client_id: apigeeApiKey.toString(), // Ensure client_id is a string
    response_type: "code",
    state: newState
  }

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
