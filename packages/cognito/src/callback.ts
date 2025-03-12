import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, GetCommand, DeleteCommand} from "@aws-sdk/lib-dynamodb"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

import {StateItem} from "./types"

/*
 * Expects the following environment variables to be set:
 *
 * StateMappingTableName
 * COGNITO_CLIENT_ID
 * COGNITO_DOMAIN
 * MOCK_OIDC_ISSUER
 * PRIMARY_OIDC_ISSUER
 *
 */

const logger = new Logger({serviceName: "idp-response"})
const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

// Environment variables
const stateMappingTableName = process.env["StateMappingTableName"] as string
const fullCognitoDomain = process.env["COGNITO_DOMAIN"] as string

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})

  // Destructure and validate required query parameters
  const {state, code, session_state} = event.queryStringParameters || {}
  if (!state || !code || !session_state) {
    logger.error(
      "Missing required query parameters: state, code, or session_state",
      {state, code, session_state}
    )
    throw new Error("Missing required query parameters: state, code, or session_state")
  }
  logger.info("Incoming query parameters", {state, code, session_state})

  // Get the original Cognito state from DynamoDB
  const getResult = await documentClient.send(
    new GetCommand({
      TableName: stateMappingTableName,
      Key: {State: state}
    })
  )

  // Always delete the old state
  await documentClient.send(
    new DeleteCommand({
      TableName: stateMappingTableName,
      Key: {State: state}
    })
  )

  if (!getResult.Item) {
    logger.error("Failed to get state from table", {tableName: stateMappingTableName})
    throw new Error("State not found in DynamoDB")
  }

  const cognitoStateItem = getResult.Item as StateItem

  // Build response parameters for redirection
  const responseParams = {
    state: cognitoStateItem.CognitoState,
    session_state,
    code
  }

  const redirectUri = `https://${fullCognitoDomain}/oauth2/idpresponse` +
    `?${new URLSearchParams(responseParams).toString()}`

  logger.info("Redirecting to Cognito", {redirectUri})

  return {
    statusCode: 302,
    headers: {Location: redirectUri},
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
