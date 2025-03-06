import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

import {createHash} from "crypto"

// This is the OIDC /authorize endpoint, which we will redirect to after adding the query parameter
const authorizeEndpoint = process.env["IDP_AUTHORIZE_PATH"] as string

// Since we have to use the same lambda for mock and primary, we need both client IDs.
// We switch between them based on the header.
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
};

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

  // ********************************* //
  // UPDATE THE PARAMETERS FOR CIS2
  // ********************************* //

  // grab the old state's hash for dynamo
  const cis2State = createHash("sha256").update(queryStringParameters.state as string).digest("hex")

  // Limit the login window to 5 minutes
  const stateTtl = Math.floor(Date.now() / 1000) + 300

  // ********************************* //
  // CACHE INCOMING COGNITO DATA
  // ********************************* //

  // This data will be retrieved by the `state` value
  const Item: StateItem = {
    State: cis2State,
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

  const redirectUri = `https://${cloudfrontDomain}/oauth2/callback`

  // minimal alteration of params
  const responseParameters = {
    ...queryStringParameters,
    state: cis2State,
    "redirect_uri": redirectUri
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
