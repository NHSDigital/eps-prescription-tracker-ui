import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, DeleteCommand} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {getUsernameFromEvent, fetchAndVerifyCIS2Tokens, initializeOidcConfig} from "@cpt-ui-common/authFunctions"
import axios from "axios"

const logger = new Logger({serviceName: "CIS2SignOut"})

const dynamoClient = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const MOCK_MODE_ENABLED = process.env["MOCK_MODE_ENABLED"]
const tokenMappingTableName = process.env["TokenMappingTableName"] ?? ""

// Create a config for cis2 and mock
// this is outside functions so it can be re-used and caching works
const {mockOidcConfig, cis2OidcConfig} = initializeOidcConfig()

const errorResponseBody = {message: "A system error has occurred"}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  // Mock usernames start with "Mock_", and real requests use usernames starting with "Primary_"
  const username = getUsernameFromEvent(event)
  const isMockToken = username.startsWith("Mock_")

  // Determine whether this request should be treated as mock or real.
  if (isMockToken && MOCK_MODE_ENABLED !== "true") {
    logger.error("Trying to use a mock user when mock mode is disabled")
    throw new Error("Trying to use a mock user when mock mode is disabled")
  }

  const isMockRequest = MOCK_MODE_ENABLED === "true" && isMockToken

  const {cis2AccessToken, cis2IdToken} = await fetchAndVerifyCIS2Tokens(
    event,
    documentClient,
    logger,
    isMockRequest ? mockOidcConfig : cis2OidcConfig
  )

  // Make a GET request, with the CIS2 tokens, to the end session endpoint
  // eslint-disable-next-line max-len
  const end_session_endpoint = "https://am.nhsint.auth-ptl.cis2.spineservices.nhs.uk:443/openam/oauth2/realms/root/realms/NHSIdentity/realms/Healthcare/connect/endSession"
  const axiosInstance = axios.create()
  const logout_response = await axiosInstance.get(
    end_session_endpoint,
    {
      headers: {
        Authorization: `Bearer ${cis2AccessToken}`
      },
      params: {
        id_token_hint: cis2IdToken
      }
    }
  )
  logger.info("Made the end session request. Response given in this log event.", {logout_response})

  const docDelete = new DeleteCommand({
    TableName: tokenMappingTableName,
    Key: {username}
  })
  const response = await documentClient.send(docDelete)
  logger.info("Attempted to delete record for this user. Dynamo response:", {response, username})

  if (response.$metadata.httpStatusCode !== 200) {
    logger.error("Failed to delete tokens from dynamoDB", response)
    throw new Error("Failed to delete tokens from dynamoDB")
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "CIS2 logout completed"
    })
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
