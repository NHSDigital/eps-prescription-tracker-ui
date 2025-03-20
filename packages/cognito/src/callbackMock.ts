import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {createHash, randomBytes} from "crypto"

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

const logger = new Logger({serviceName: "callbackMock"})
const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

// Environment variables
const stateMappingTableName = process.env["StateMappingTableName"] as string
const SessionStateMappingTableName = process.env["SessionStateMappingTableName"] as string
const fullCognitoDomain = process.env["COGNITO_DOMAIN"] as string

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

type SessionStateItem = {
  LocalCode: string,
  SessionState: string;
  ApigeeCode: string;
  ExpiryTime: number
};

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

  // First, check if this is a pull request redirection
  try {
    const decodedStateString = Buffer.from(state, "base64").toString("utf-8")
    logger.debug("Decoded state string", {decodedStateString})
    const decodedState = JSON.parse(decodedStateString)
    if (decodedState.isPullRequest) {
      const responseParams = {
        state,
        session_state,
        code
      }
      const baseRedirectUri = decodedState.redirectUri
      const redirectUri = `${baseRedirectUri}?${new URLSearchParams(responseParams).toString()}`
      logger.debug(`return redirect to ${redirectUri}`, {baseRedirectUri, responseParams})
      return {
        statusCode: 302,
        headers: {Location: redirectUri},
        isBase64Encoded: false,
        body: JSON.stringify({})
      }
    }
  } catch (decodeError) {
    logger.warn("Could not base64 decode state", {error: decodeError})
    // Continue with regular flow
  }

  // If not a PR redirect, continue with the standard Cognito flow
  // Get the original Cognito state from DynamoDB
  logger.debug("trying to get data from session state table", {
    stateMappingTableName,
    state
  })
  const getResult = await documentClient.send(
    new GetCommand({
      TableName: stateMappingTableName,
      Key: {State: state}
    })
  )

  if (!getResult.Item) {
    logger.error("Failed to get state from table", {tableName: stateMappingTableName})
    throw new Error("State not found in DynamoDB")
  }

  const cognitoStateItem = getResult.Item as StateItem

  logger.debug("environment variables", {
    stateMappingTableName,
    SessionStateMappingTableName,
    fullCognitoDomain
  })

  // Always delete the old state
  // logger.debug("going to delete from state mapping table", {
  //   stateMappingTableName,
  //   state
  // })
  // await documentClient.send(
  //   new DeleteCommand({
  //     TableName: stateMappingTableName,
  //     Key: {State: state}
  //   })
  // )

  // we need to generate a session state param and store it along with code returned
  // as that will be used in the token lambda
  // Generate the hashed state value
  const sessionState = createHash("sha256").update(state).digest("hex")
  const localCode = randomBytes(20).toString("hex")

  const sessionStateExpiryTime = Math.floor(Date.now() / 1000) + 300

  const item: SessionStateItem = {
    LocalCode: localCode,
    SessionState: sessionState,
    ApigeeCode: code,
    ExpiryTime: sessionStateExpiryTime
  }

  logger.debug("going to insert into session state mapping table", {
    SessionStateMappingTableName,
    item
  })
  await documentClient.send(
    new PutCommand({
      TableName: SessionStateMappingTableName,
      Item: item
    })
  )

  // Build response parameters for redirection
  const responseParams = {
    state: cognitoStateItem.CognitoState,
    session_state: sessionState,
    code: localCode
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
