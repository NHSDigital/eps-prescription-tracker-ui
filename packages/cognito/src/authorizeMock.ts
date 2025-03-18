import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

import {createHash} from "crypto"

import {StateItem} from "./types"

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

const logger = new Logger({serviceName: "authorizeMock"})
const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})

  // Validate required environment variables
  if (!cloudfrontDomain) throw new Error("Cloudfront domain environment variable not set")
  if (!stateMappingTableName) throw new Error("State mapping table name environment variable not set")
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
  queryParams.scope = "openid profile email nhsperson nationalrbacaccess associatedorgs"

  // Ensure the state parameter is provided
  const originalState = queryParams.state
  if (!originalState) throw new Error("Missing state parameter")

  // Generate the hashed state value
  const cis2State = createHash("sha256").update(originalState).digest("hex")

  // Set TTL for 5 minutes from now
  const stateTtl = Math.floor(Date.now() / 1000) + 300

  // Build the callback URI for redirection
  const callbackUri = `https://${cloudfrontDomain}/oauth2/mock-callback`

  // Store original state mapping in DynamoDB
  const item: StateItem = {
    State: cis2State,
    CognitoState: originalState,
    ExpiryTime: stateTtl
  }

  await documentClient.send(
    new PutCommand({
      TableName: stateMappingTableName,
      Item: item
    })
  )

  const responseParameters = {
    response_type: "code",
    scope: queryParams.scope as string,
    client_id: apigeeApiKey,
    state: cis2State,
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
