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
const tableName = process.env["StateMappingTableName"] as string

// TODO: GET THESE
const cognitoClientId = process.env["COGNITO_CLIENT_ID"] as string
const cloudfrontDomain = process.env["FULL_CLOUDFRONT_DOMAIN"] as string

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

type StateItem = {
  State: string;
  CodeVerifier: string;
  CognitoState: string;
  Ttl: number;
};

const lambdaHandler = async (event: APIGatewayProxyEvent) => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })
  logger.info("Event payload:", {event})

  const queryParams = event.queryStringParameters || {}

  // If either of these are missing, something's gone wrong.
  if (!queryParams.state || !queryParams.code) {
    throw new Error("code or state parameter missing from request")
  }

  // Log the lookup action in DynamoDB.
  logger.info("Incoming query parameters", {queryParams})

  // Query DynamoDB for the state mapping.
  const stateResult = await documentClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {State: queryParams.state}
    })
  )

  if (!stateResult.Item) {
    throw new Error("State not found in DynamoDB")
  }

  const stateItem = stateResult.Item as StateItem

  // Build the response parameters to be sent back in the redirect.
  const responseParams = {
    code: queryParams.code,
    iss: queryParams.iss as string,
    state: stateItem.CognitoState,
    client_id: cognitoClientId
  }

  // Construct the redirect URI by appending the response parameters.
  const redirectUri = `https://${cloudfrontDomain}?${new URLSearchParams(responseParams).toString()}`

  logger.info("Redirecting to Cognito", {redirectUri})

  return {
    statusCode: 302,
    body: JSON.stringify({}),
    headers: {
      Location: redirectUri
    }
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
