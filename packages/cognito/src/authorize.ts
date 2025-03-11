import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

import {createHash} from "crypto"
import {redirect} from "next/dist/server/api-utils"

// Environment variables
const authorizeEndpoint = process.env["IDP_AUTHORIZE_PATH"] as string
const cis2ClientId = process.env["OIDC_CLIENT_ID"] as string
const useMock = process.env["useMock"] as string
const userPoolClientId = process.env["COGNITO_CLIENT_ID"] as string
const cloudfrontDomain = process.env["FULL_CLOUDFRONT_DOMAIN"] as string
const tableName = process.env["StateMappingTableName"] as string
const apigeeApiKey = process.env["APIGEE_API_KEY"] as string

const logger = new Logger({serviceName: "authorize"})
const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

type StateItem = {
  State: string;
  CognitoState: string;
  Ttl: number;
  UseMock: boolean;
};

const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Event payload:", {event})

  // Validate required environment variables
  console.log(useMock)
  if (useMock === undefined) throw new Error("useMock not defined!")
  if (!cloudfrontDomain) throw new Error("Cloudfront domain environment variable not set")
  if (!tableName) throw new Error("State mapping table name environment variable not set")
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
  const callbackUri = `https://${cloudfrontDomain}/oauth2/callback`

  // Store original state mapping in DynamoDB
  const item: StateItem = {
    State: cis2State,
    CognitoState: originalState,
    Ttl: stateTtl,
    UseMock: useMock === "true"
  }

  await documentClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item
    })
  )

  // Build the redirect parameters for CIS2
  // const responseParameters = {
  //   response_type: queryParams.response_type as string,
  //   scope: queryParams.scope as string,
  //   client_id: cis2ClientId,
  //   state: cis2State,
  //   redirect_uri: callbackUri,
  //   prompt: "login"
  // }

  // This is the CIS2 URL we are pointing the client towards
  //const redirectPath = `${authorizeEndpoint}?${new URLSearchParams(responseParameters)}`

  // need to set the redirect path to apigee
  const responseParameters = {
    client_id: apigeeApiKey,
    redirect_uri: callbackUri,
    response_type: "code",
    state: cis2State
  }
  // eslint-disable-next-line max-len
  const redirectPath = `https://internal-dev.api.service.nhs.uk/oauth2-mock/authorize?${new URLSearchParams(responseParameters)}`

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
