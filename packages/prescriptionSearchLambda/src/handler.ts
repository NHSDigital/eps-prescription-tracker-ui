import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import axios, {AxiosError} from "axios"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {rewriteBodyToAddSignedJWT, formatHeaders} from "./helpers"
import {fetchAndVerifyCIS2Tokens} from "./cis2TokenHelpers"
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
  let apigeeAccessToken: string

  try {
    // Step 1: Fetch and verify CIS2 tokens using the `idToken` provided
    const {cis2AccessToken, cis2IdToken} = await fetchAndVerifyCIS2Tokens(event, documentClient, logger)
    logger.info("Successfully fetched and verified CIS2 tokens", {cis2AccessToken, cis2IdToken})

    // Step 2: Exchange CIS2 access token for an Apigee access token
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
      subject_token: cis2AccessToken,
      client_id: process.env["oidcClientId"]
    }

    // Rewrite payload to include the signed JWT client assertion
    const rewrittenBody = rewriteBodyToAddSignedJWT(logger, tokenExchangeData, apigeeTokenEndpoint, jwtPrivateKey)

    // Make the token exchange request
    const tokenResponse = await axiosInstance.post(apigeeTokenEndpoint, stringify(rewrittenBody), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    })

    apigeeAccessToken = tokenResponse.data.access_token

    // Step 3: Update DynamoDB with the new Apigee access token
    const currentTime = Math.floor(Date.now() / 1000)
    await documentClient.send(
      new UpdateCommand({
        TableName: TokenMappingTableName,
        Key: {username: event.requestContext.authorizer?.claims["cognito:username"]},
        UpdateExpression: "SET Apigee_accessToken = :apigeeAccessToken, Apigee_expiresIn = :apigeeExpiresIn",
        ExpressionAttributeValues: {
          ":apigeeAccessToken": apigeeAccessToken,
          ":apigeeExpiresIn": currentTime + tokenResponse.data.expires_in
        }
      })
    )

    logger.info("Apigee access token updated in DynamoDB")
  } catch (error) {
    logger.error("Error during token exchange or DynamoDB operations", {error})
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error during token operations",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }

  // Step 4: Fetch prescription data from the Apigee API
  const prescriptionId = event.queryStringParameters?.prescriptionId || "defaultId"

  // Error handling for fetching prescription data
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
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error("Error fetching prescription data from Apigee", {
        error: error.message,
        response: error.response?.data
      })

      return {
        statusCode: error.response?.status || 500,
        body: JSON.stringify({
          message: "Failed to fetch prescription data from Apigee API",
          details: error.response?.data || "Unknown error"
        })
      }
    } else if (error instanceof Error) {
      logger.error("General error fetching prescription data from Apigee", {
        error: error.message
      })

      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Unexpected error",
          details: error.message
        })
      }
    } else {
      logger.error("Unexpected non-error object thrown during prescription fetch", {error})
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Unexpected error",
          details: "Unknown error occurred"
        })
      }
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
