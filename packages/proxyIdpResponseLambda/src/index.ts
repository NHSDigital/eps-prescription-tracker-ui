import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

const logger = new Logger({serviceName: "idp-response"})

const errorResponseBody = {
  message: "A system error has occurred"
}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

// Environment variables
// Retrieve the original state from this table
const tableName = process.env["StateMappingTableName"] as string

// The cognito client ID must be re-added.
const cognitoClientId = process.env["COGNITO_CLIENT_ID"] as string
// And this is where to send the client with their login event (i.e. back to the app)
const fullCognitoDomain = process.env["COGNITO_DOMAIN"] as string
// This needs to be set
const primaryOidcIssuer = process.env["PRIMARY_OIDC_ISSUER"] as string
const mockOidcIssuer = process.env["MOCK_OIDC_ISSUER"] as string

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

type StateItem = {
  State: string;
  CodeVerifier: string;
  CognitoState: string;
  Ttl: number;
  UseMock: boolean;
};

const lambdaHandler = async (event: APIGatewayProxyEvent) => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })
  logger.info("Event payload:", {event})

  // Incoming CIS2 response parameters
  const cis2QueryParams = event.queryStringParameters || {}
  logger.info("Incoming query parameters", {cis2QueryParams})

  // If either of these are missing, something's gone wrong.
  if (!cis2QueryParams.state || !cis2QueryParams.code) {
    throw new Error("code or state parameter missing from request")
  }

  // Fetch the original cognito state data
  const cognitoState = await documentClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {State: cis2QueryParams.state}
    })
  )
  // TODO: Delete the old state before proceeding

  if (!cognitoState.Item) {
    throw new Error("State not found in DynamoDB")
  }

  const cognitoStateItem = cognitoState.Item as StateItem

  const iss = cognitoStateItem.UseMock ? mockOidcIssuer : primaryOidcIssuer

  // Build the response parameters to be sent back in the redirect.
  const responseParams = {
    code: cis2QueryParams.code,
    iss: iss,
    state: cognitoStateItem.CognitoState,
    client_id: cognitoClientId
  }

  // Construct the redirect URI by appending the response parameters.
  // https://login.auth.cpt-ui.dev.eps.national.nhs.uk/oauth2/idpresponse?${params}
  const redirectUri = (
    `https://${fullCognitoDomain}/oauth2/idpresponse` +
    `?${new URLSearchParams(responseParams).toString()}`
  )

  logger.info("Redirecting to Cognito", {redirectUri})

  return {
    statusCode: 302,
    headers: {
      Location: redirectUri
    },
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
