import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import axios from "axios"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb"
import {rewriteBodyToAddSignedJWT, formatHeaders} from "./helpers"
import {stringify} from "querystring" // Ensure stringify is imported here

const logger = new Logger({serviceName: "prescriptionSearch"})
const apigeeTokenEndpoint = "https://api.service.nhs.uk/oauth2/token"
const apigeePrescriptionsEndpoint = "https://internal-dev.api.service.nhs.uk/clinical-prescription-tracker"
const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const roleId = "555254242106"

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  const axiosInstance = axios.create()

  // Retrieve CIS2_accessToken based on username
  const username = event.requestContext.authorizer?.claims["cognito:username"]
  if (!username) {
    return {
      statusCode: 400,
      body: JSON.stringify({message: "Missing or invalid username"})
    }
  }

  let cis2AccessToken
  try {
    logger.info("Fetching CIS2 access token from DynamoDB")
    const result = await documentClient.send(
      new GetCommand({
        TableName: TokenMappingTableName,
        Key: {username}
      })
    )

    if (result.Item && result.Item.CIS2_accessToken) {
      cis2AccessToken = result.Item.CIS2_accessToken
    } else {
      logger.error("CIS2 access token not found for user")
      return {
        statusCode: 404,
        body: JSON.stringify({message: "CIS2 access token not found for user"})
      }
    }
  } catch (error) {
    logger.error("Error fetching data from DynamoDB", {error})
    return {
      statusCode: 500,
      body: JSON.stringify({message: "Internal server error while accessing DynamoDB"})
    }
  }

  // Exchange CIS2_accessToken for an Apigee access token
  let apigeeAccessToken
  try {
    logger.info("Exchanging CIS2 access token for Apigee access token")
    const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)

    if (!jwtPrivateKey) {
      throw new Error("JWT private key not found")
    }

    // Creating a signed JWT for client assertion using helper function
    const tokenExchangeData = {
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      subject_token: cis2AccessToken,
      client_id: process.env["CLIENT_ID"] // Assuming you have a client ID set in environment variables
    }

    const rewrittenBody = rewriteBodyToAddSignedJWT(logger, tokenExchangeData, apigeeTokenEndpoint, jwtPrivateKey as string)
    const tokenResponse = await axiosInstance.post(apigeeTokenEndpoint, stringify(rewrittenBody), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    })

    apigeeAccessToken = tokenResponse.data.access_token
    if (!apigeeAccessToken) {
      throw new Error("Failed to obtain Apigee access token")
    }

    // Store Apigee access token in DynamoDB
    const updateParams = {
      Item: {
        username,
        Apigee_accessToken: apigeeAccessToken,
        Apigee_expiresIn: tokenResponse.data.expires_in
      },
      TableName: TokenMappingTableName
    }

    await documentClient.send(new PutCommand(updateParams))
  } catch (error) {
    logger.error("Error during Apigee token exchange", {error})
    return {
      statusCode: 500,
      body: JSON.stringify({message: "Error during Apigee token exchange", details: error})
    }
  }

  // Call Apigee with Apigee access token
  const prescriptionId = event.queryStringParameters?.prescriptionId || "defaultId"
  try {
    logger.info("Calling Apigee endpoint", {endpoint: `${apigeePrescriptionsEndpoint}/prescription-search/${prescriptionId}`})
    const apigeeResponse = await axiosInstance.get(`${apigeePrescriptionsEndpoint}/prescription-search/${prescriptionId}`, {
      headers: {
        Authorization: `Bearer ${apigeeAccessToken}`,
        "NHSD-Session-URID": roleId
      }
    })

    return {
      statusCode: 200,
      body: JSON.stringify(apigeeResponse.data),
      headers: formatHeaders(apigeeResponse.headers)
    }
  } catch (apigeeError) {
    if (axios.isAxiosError(apigeeError)) {
      logger.error("Error calling Apigee API", {error: apigeeError.message, response: apigeeError.response?.data})
      return {
        statusCode: apigeeError.response?.status || 500,
        body: JSON.stringify({
          message: "Failed to fetch data from Apigee API",
          details: apigeeError.response?.data || "Unknown error"
        })
      }
    } else {
      logger.error("Unexpected error calling Apigee API", {error: String(apigeeError)})
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Failed to fetch data from Apigee API",
          details: "An unexpected error occurred"
        })
      }
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
