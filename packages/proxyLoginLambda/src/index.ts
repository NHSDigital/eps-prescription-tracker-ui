import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb"

import {GetRandomPasswordCommand, SecretsManagerClient} from "@aws-sdk/client-secrets-manager"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

import {createHash} from "crypto"

// This is the OIDC /authorize endpoint, which we will redirect to after adding the query parameter
const oidcAuthorizeEndpoint = process.env["CIS2_IDP_AUTHORIZE_PATH"] as string
const mockAuthorizeEndpoint = process.env["MOCK_IDP_AUTHORIZE_PATH"] as string

// Since we have to use the same lambda for mock and primary, we need both client IDs.
// We switch between them based on the header.
const oidcClientId = process.env["CIS2_OIDC_CLIENT_ID"] as string
const mockClientId = process.env["MOCK_OIDC_CLIENT_ID"] as string
const useMock = process.env["useMock"] as string

const userPoolClientId = process.env["COGNITO_CLIENT_ID"] as string

// The stack name is needed to figure out the return address for the login event, so
// we can intercept it after the CIS2 login
const cloudfrontDomain = process.env["FULL_CLOUDFRONT_DOMAIN"] as string
// And since we need to store the original state for the return journey, this table will be used. for that
const tableName = process.env["StateMappingTableName"] as string

const logger = new Logger({serviceName: "authorize"})

const errorResponseBody = {
  message: "A system error has occurred"
}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

type StateItem = {
  State: string;
  CodeVerifier: string;
  CognitoState: string;
  Ttl: number;
  UseMock: boolean;
};

const secretsManagerClient = new SecretsManagerClient()

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })
  logger.info("Event payload:", {event})

  // Check we're set up properly.
  if (!useMock) {
    throw new Error("useMock not defined!")
  }
  if (!oidcAuthorizeEndpoint) {
    throw new Error("Upstream login endpoint environment variable not set")
  }
  if (!mockAuthorizeEndpoint) {
    throw new Error("Mock OIDC authorization endpoint environment variable not set")
  }
  if (!cloudfrontDomain) {
    throw new Error("Cloudfront domain environment variable not set")
  }
  if (!tableName) {
    throw new Error("State mapping table name environment variable not set")
  }
  if (!userPoolClientId) {
    throw new Error("Cognito user pool client ID environment variable not set")
  }
  if (!oidcClientId) {
    throw new Error("OIDC client ID environment variable not set")
  }
  if (!mockClientId) {
    throw new Error("Mock OIDC client ID environment variable not set")
  }

  // Original query parameters.
  const queryStringParameters = event.queryStringParameters || {}

  // Decide if we're using mock of primary authentication. set variables accordingly.
  let clientId
  let authorizeEndpoint
  switch (queryStringParameters.identity_provider) {
    case "Mock": {
      if (useMock.toLowerCase() !== "true") {
        throw new Error("Mock is not enabled, but was requested.")
      }
      clientId = mockClientId
      authorizeEndpoint = mockAuthorizeEndpoint
      logger.info("Using mock auth.", {clientId, authorizeEndpoint})
      break
    }
    case "Primary": {
      clientId = oidcClientId
      authorizeEndpoint = oidcAuthorizeEndpoint
      logger.info("Using primary auth.", {clientId, authorizeEndpoint})
      break
    }
    default:
      throw new Error("Unrecognized identity provider")
  }

  if (queryStringParameters.client_id !== userPoolClientId) {
    throw new Error(
      `Mismatch in OIDC client ID. Payload: ` +
      `${queryStringParameters.client_id} | Expected: ${userPoolClientId}`
    )
  }

  // ********************************* //
  // UPDATE THE PARAMETERS FOR CIS2
  // ********************************* //

  // Alter the scope FROM the cognito scopes, TO the CIS2 scopes
  // FIXME: there may be an issue with mismatching scopes
  // openid email phone profile aws.cognito.signin.user.admin
  // This SHOULD be
  // openid profile email nhsperson nationalrbacaccess associatedorgs
  queryStringParameters.scope = "openid"

  // grab the old state's hash for dynamo
  const cis2State = createHash("sha256").update(queryStringParameters.state as string).digest("hex")

  // Limit the login window to 5 minutes
  const stateTtl = Math.floor(Date.now() / 1000) + 300

  // Set the redirection URL header, to return to our proxy callback
  const callbackUri = `https://${cloudfrontDomain}/oauth2/callback`

  // Generate CodeVerifier
  // TODO: This may not be necessary for us. Example code makes it, but docs don't seem to apply
  // to our use case
  // https://docs.aws.amazon.com/cognito/latest/developerguide/using-pkce-in-authorization-code.html
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

  // ********************************* //
  // CACHE INCOMING COGNITO DATA
  // ********************************* //

  // This data will be retrieved by the `state` value
  const Item: StateItem = {
    State: cis2State,
    CodeVerifier: codeVerifier,
    CognitoState: queryStringParameters.state as string,
    Ttl: stateTtl,
    UseMock: useMock === "true"
  }

  await documentClient.send(
    new PutCommand({
      Item,
      TableName: tableName
    })
  )

  // ********************************* //
  // REDIRECT TO CIS2
  // ********************************* //

  // These are the parameters we pass back in the redirection response to CIS2
  const responseParameters = {
    response_type: queryStringParameters.response_type as string,
    scope: queryStringParameters.scope as string,
    client_id: clientId,
    state: cis2State,
    redirect_uri: callbackUri,
    prompt: "login"
  }

  // This is the CIS2 URL we are pointing the client towards
  const redirectPath = `${authorizeEndpoint}?${new URLSearchParams(responseParameters)}`

  // Return an HTTP 302 redirect response.
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
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(middyErrorHandler.errorHandler({logger: logger}))
