import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {deleteStateMapping, getStateMapping} from "@cpt-ui-common/dynamoFunctions"

/*
 * Expects the following environment variables to be set:
 *
 * StateMappingTableName
 * COGNITO_CLIENT_ID
 * COGNITO_DOMAIN
 * PRIMARY_OIDC_ISSUER
 *
 */

const logger = new Logger({serviceName: "callback"})
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
  // TODO: investigate if session_state is needed at all for this function
  const {state, code, session_state} = event.queryStringParameters || {}
  if (!state || !code) {
    logger.error(
      "Missing required query parameters: state, code, or session_state",
      {state, code}
    )
    throw new Error("Missing required query parameters: state, code, or session_state")
  }
  logger.info("Incoming query parameters", {state, code})

  const cognitoStateItem = await getStateMapping(documentClient, stateMappingTableName, state, logger)
  await deleteStateMapping(documentClient, stateMappingTableName, state, logger)

  // Build response parameters for redirection
  const responseParams = {
    state: cognitoStateItem.CognitoState,
    session_state: session_state || "",
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
