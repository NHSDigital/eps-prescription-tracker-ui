import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

import {randomBytes, createHash} from "crypto"

// This is the OIDC /authorize endpoint, which we will redirect to after adding the query parameter
const authorizeEndpoint = process.env["IDP_AUTHORIZE_PATH"] as string

// Since we have to use the same lambda for mock and primary, we need both client IDs.
const cis2ClientId = process.env["OIDC_CLIENT_ID"] as string
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
  CognitoState: string;
  Ttl: number;
  UseMock: boolean;
  CodeVerifier: string;
};

// Helper function to base64 URL encode a buffer
function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

// Generate a random code verifier (hex string, 64 characters from 32 bytes)
function generateCodeVerifier(bytes: number = 32): string {
  return randomBytes(bytes).toString("hex")
}

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })
  logger.info("Event payload:", {event})

  // Check we're set up properly.
  if (!useMock) {
    throw new Error("useMock not defined!")
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
  if (!cis2ClientId) {
    throw new Error("OIDC client ID environment variable not set")
  }

  // Original query parameters.
  const queryStringParameters = event.queryStringParameters || {}
  const originalState = queryStringParameters.state as string

  // ********************************* //
  // UPDATE THE PARAMETERS FOR CIS2
  // ********************************* //

  // Compute a hash of the original state to use as the key.
  const cis2State = createHash("sha256").update(originalState).digest("hex")

  // ---- PKCE Addition ----
  // Generate the code verifier.
  const codeVerifier = generateCodeVerifier()
  // Compute the SHA‑256 digest and base64url–encode it to produce the code challenge.
  const sha256Digest = createHash("sha256").update(codeVerifier).digest()
  const codeChallenge = base64URLEncode(sha256Digest)
  // -----------------------

  // Limit the login window to 5 minutes
  const stateTtl = Math.floor(Date.now() / 1000) + 300

  // ********************************* //
  // CACHE INCOMING COGNITO DATA
  // ********************************* //

  // This data will be retrieved by the `state` value
  const Item: StateItem = {
    State: cis2State,
    CognitoState: originalState,
    Ttl: stateTtl,
    UseMock: useMock === "true",
    CodeVerifier: codeVerifier
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

  const redirectUri = `https://${cloudfrontDomain}/oauth2/callback`

  // Update the parameters by replacing the state with its hash, setting the redirect URI,
  // and adding the PKCE parameters.
  const responseParameters = {
    ...queryStringParameters,
    state: cis2State,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
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
