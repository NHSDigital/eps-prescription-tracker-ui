import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import axios, {AxiosError} from "axios"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, GetCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {rewriteBodyToAddSignedJWT, formatHeaders} from "./helpers"
import {stringify} from "querystring"

// Logger initialization
const logger = new Logger({serviceName: "prescriptionSearch"})

// External endpoints and environment variables
const apigeeTokenEndpoint = "https://api.service.nhs.uk/oauth2/token"
const apigeePrescriptionsEndpoint = "https://internal-dev.api.service.nhs.uk/clinical-prescription-tracker"
const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const roleId = "555254242106"

// DynamoDB client setup
const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

// Error response template
const errorResponseBody = {
  message: "A system error has occurred"
}

// Middleware error handler
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Attach request ID for tracing
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  const axiosInstance = axios.create()

  // Step 1: Validate the Cognito `Authorization` header
  const authorizationHeader = event.headers["Authorization"] || event.headers["authorization"]
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    logger.error("Missing or invalid Authorization header.")
    return {
      statusCode: 401,
      body: JSON.stringify({message: "Unauthorized: Missing or invalid Authorization header."})
    }
  }

  // Step 2: Extract the username from Cognito claims
  const username = event.requestContext.authorizer?.claims["cognito:username"]
  if (!username) {
    logger.error("Username not found in Cognito claims.")
    return {
      statusCode: 400,
      body: JSON.stringify({message: "Missing or invalid username in access token"})
    }
  }

  let apigeeAccessToken
  try {
    // Step 3: Retrieve token data from DynamoDB
    logger.info("Fetching CIS2 access token and Apigee access token from DynamoDB")
    const result = await documentClient.send(
      new GetCommand({
        TableName: TokenMappingTableName,
        Key: {username}
      })
    )

    if (!result.Item) {
      logger.error("User token data not found in DynamoDB")
      return {
        statusCode: 404,
        body: JSON.stringify({message: "User token data not found"})
      }
    }

    const {CIS2_accessToken, Apigee_accessToken, Apigee_expiresIn} = result.Item
    const currentTime = Math.floor(Date.now() / 1000)

    // Step 4: Check if the Apigee access token is still valid
    if (Apigee_accessToken && Apigee_expiresIn > currentTime) {
      logger.info("Using existing Apigee access token from DynamoDB")
      apigeeAccessToken = Apigee_accessToken
    } else {
      // Step 5: Exchange CIS2 access token for a new Apigee access token
      logger.info("Exchanging CIS2 access token for Apigee access token")

      // Fetch the private key for signing the client assertion
      const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
      if (!jwtPrivateKey || typeof jwtPrivateKey !== "string") {
        throw new Error("Invalid or missing JWT private key")
      }

      // Construct the token exchange payload
      const tokenExchangeData = {
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
        subject_token: CIS2_accessToken,
        client_id: process.env["oidcClientId"]
      }

      // Rewrite payload to include the signed JWT client assertion
      const rewrittenBody = rewriteBodyToAddSignedJWT(
        logger,
        tokenExchangeData,
        apigeeTokenEndpoint,
        jwtPrivateKey
      )

      // Make the token exchange request
      const tokenResponse = await axiosInstance.post(
        apigeeTokenEndpoint,
        stringify(rewrittenBody),
        {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
      )

      apigeeAccessToken = tokenResponse.data.access_token

      // Step 6: Store the new Apigee access token in DynamoDB
      await documentClient.send(
        new UpdateCommand({
          TableName: TokenMappingTableName,
          Key: {username},
          UpdateExpression:
            "SET Apigee_accessToken = :apigeeAccessToken, Apigee_expiresIn = :apigeeExpiresIn",
          ExpressionAttributeValues: {
            ":apigeeAccessToken": apigeeAccessToken,
            ":apigeeExpiresIn": currentTime + tokenResponse.data.expires_in
          }
        })
      )

      logger.info("Updated Apigee access token in DynamoDB")
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Error during Apigee token exchange or DynamoDB operations", {error})
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Error during Apigee token exchange",
          details: error.message || "Unknown error"
        })
      }
    }
    logger.error("Unexpected non-error object thrown during token exchange", {error})
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Unexpected error",
        details: "Unknown error occurred"
      })
    }
  }

  // Step 7: Fetch prescription data from Apigee API
  const prescriptionId = event.queryStringParameters?.prescriptionId || "defaultId"

  try {
    logger.info("Calling Apigee API to fetch prescription data", {prescriptionId})
    const apigeeResponse = await axiosInstance.get(
      `${apigeePrescriptionsEndpoint}/prescription-search/${prescriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${apigeeAccessToken}`,
          "NHSD-Session-URID": roleId
        }
      }
    )

    return {
      statusCode: 200,
      body: JSON.stringify(apigeeResponse.data),
      headers: formatHeaders(apigeeResponse.headers)
    }
  } catch (apigeeError) {
    if (apigeeError instanceof AxiosError) {
      logger.error("Error fetching prescription data from Apigee", {
        error: apigeeError.message,
        response: apigeeError.response?.data
      })
      return {
        statusCode: apigeeError.response?.status || 500,
        body: JSON.stringify({
          message: "Failed to fetch prescription data from Apigee API",
          details: apigeeError.response?.data || "Unknown error"
        })
      }
    }
    logger.error("Unexpected non-error object thrown during prescription fetch", {apigeeError})
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Unexpected error",
        details: "Unknown error occurred"
      })
    }
  }
}

// Export the Lambda function with middleware applied
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
