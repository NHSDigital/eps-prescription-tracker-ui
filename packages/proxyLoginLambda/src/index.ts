import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb"

import {GetRandomPasswordCommand, SecretsManagerClient} from "@aws-sdk/client-secrets-manager"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

import {createHash} from "crypto"

// This is the OIDC /authorize endpoint, which we will redirect to
const oidcAuthorizeEndpoint = process.env["CIS2_IDP_AUTHORIZE_PATH"] as string
const oidcClientId = process.env["CIS2_OIDC_CLIENT_ID"] as string
// The stack name is needed to figure out the return address for the login event, so
// we can intercept it after the CIS2 login
const stackName = process.env["FULL_CLOUDFRONT_DOMAIN"] as string
const tableName = process.env["StateMappingTableName"] as string

const logger = new Logger({serviceName: "authorize"})

const errorResponseBody = {
  message: "A system error has occurred"
}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const secretsManagerClient = new SecretsManagerClient()

const lambdaHandler = async (event: APIGatewayProxyEvent) => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })
  logger.info("Event payload:", {event})

  // This is set to mock for the mock lambda, and set to CIS2 for the prod lambda
  if (!oidcAuthorizeEndpoint) {
    throw new Error("Upstream login endpoint environment variable not set")
  }
  // Check we're set up properly.
  if (!stackName) {
    throw new Error("Cloudfront domain environment variable not set")
  }
  if (!tableName) {
    throw new Error("State mapping table name environment variable not set")
  }
  if (!oidcClientId) {
    throw new Error("OIDC client ID environment variable not set")
  }

  // Original query parameters.
  const queryStringParameters = event.queryStringParameters || {}

  if (queryStringParameters.client_id !== oidcClientId) {
    throw new Error("Mismatch in OIDC client ID")
  }

  const randIdCommand = new GetRandomPasswordCommand({
    PasswordLength: 64,
    ExcludePunctuation: true,
    IncludeSpace: false
  })
  const randId = await secretsManagerClient.send(randIdCommand)
  const codeVerifier = randId.RandomPassword

  if (!codeVerifier) {
    throw new Error("Failed to generate the code verifier")
  }

  // grab the old state's hash for dynamo
  const hashedState = createHash("sha256").update(queryStringParameters.state as string).digest("hex")

  // Limit the login window to 5 minutes
  const stateTtl = Math.floor(Date.now() / 1000) + 300

  // This data will be retrieved by the `state` value
  await documentClient.send(
    new PutCommand({
      Item: {
        State: hashedState,
        CodeVerifier: codeVerifier,
        CognitoState: queryStringParameters.state,
        Ttl: stateTtl
      },
      TableName: tableName
    })
  )

  // Set the redirection URL header
  const callbackUri = `https://${stackName}/api/callback`

  // These are the parameters we pass back in the redirection response
  const responseParameters = {
    response_type: queryStringParameters.response_type as string,
    scope: queryStringParameters.scope as string,
    client_id: oidcClientId,
    state: hashedState,
    redirect_uri: callbackUri,
    prompt: "login"
  }

  const redirectPath = `${oidcAuthorizeEndpoint}?${new URLSearchParams(responseParameters)}`

  // Return an HTTP 302 redirect response.
  const redirect = {
    statusCode: 302,
    headers: {Location: redirectPath}
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
