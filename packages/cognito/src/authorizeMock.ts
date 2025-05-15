import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

import {createHash} from "crypto"

import {insertStateMapping} from "@cpt-ui-common/dynamoFunctions"

/*
 * Expects the following environment variables to be set:
 *
 * IDP_AUTHORIZE_PATH  -> This is the upstream auth provider - in this case CIS2
 * OIDC_CLIENT_ID
 * COGNITO_CLIENT_ID
 *
 * FULL_CLOUDFRONT_DOMAIN
 *
 * StateMappingTableName
 *
 */

// Environment variables
const authorizeEndpoint = process.env["IDP_AUTHORIZE_PATH"] as string
const cis2ClientId = process.env["OIDC_CLIENT_ID"] as string
const userPoolClientId = process.env["COGNITO_CLIENT_ID"] as string
const cloudfrontDomain = process.env["FULL_CLOUDFRONT_DOMAIN"] as string
const stateMappingTableName = process.env["StateMappingTableName"] as string
const apigeeApiKey = process.env["APIGEE_API_KEY"] as string

const logger = new Logger({serviceName: "authorize"})
const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.debug("Environment variable", {env: {
    authorizeEndpoint,
    cis2ClientId,
    userPoolClientId,
    cloudfrontDomain,
    stateMappingTableName,
    apigeeApiKey
  }})

  // Validate required environment variables
  if (!authorizeEndpoint) throw new Error("Authorize endpoint environment variable not set")
  if (!cloudfrontDomain) throw new Error("Cloudfront domain environment variable not set")
  if (!stateMappingTableName) throw new Error("State mapping table name environment variable not set")
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

  // Generate the hashed state value
  const cis2State = createHash("sha256").update(originalState).digest("hex")

  // Set TTL for 5 minutes from now
  const stateTtl = Math.floor(Date.now() / 1000) + 300

  // Build the callback URI for redirection
  // for pull requests we pack the real callback url for this pull request into the state
  // the callback lambda then decodes this and redirects to the callback url for this pull request
  const realCallbackUri = `https://${cloudfrontDomain}/oauth2/mock-callback`
  const callbackUri = "https://cpt-ui-pr-854.dev.eps.national.nhs.uk/oauth2/mock-callback"

  const newStateJson = {
    isPullRequest: true,
    redirectUri: realCallbackUri,
    originalState: cis2State
  }
  const newState = Buffer.from(JSON.stringify(newStateJson)).toString("base64")

  // Store original state mapping in DynamoDB
  const item = {
    State: cis2State,
    CognitoState: originalState,
    ExpiryTime: stateTtl
  }

  await insertStateMapping(documentClient, stateMappingTableName, item, logger)

  // Build the redirect parameters for CIS2
  const responseParameters = {
    redirect_uri: callbackUri,
    client_id: apigeeApiKey,
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
