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
import {fetchCIS2Tokens} from "./cis2TokenHelpers"
import {stringify} from "querystring"

// Logger initialization
const logger = new Logger({serviceName: "prescriptionSearch"})

// External endpoints and environment variables
const apigeeTokenEndpoint = "https://internal-dev.api.service.nhs.uk/oauth2/token"
const apigeePrescriptionsEndpoint = "https://internal-dev.api.service.nhs.uk/clinical-prescription-tracker"
const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const apigeeApiKey = process.env["apigeeApiKey"] as string
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
    // Step 1: Fetch CIS2 tokens
    logger.info("Retrieving CIS2 tokens from DynamoDB based on the current request context")
    const {cis2AccessToken, cis2IdToken} = await fetchCIS2Tokens(event, documentClient, logger)
    logger.info("Successfully fetched CIS2 tokens", {cis2AccessToken, cis2IdToken})

    // Step 2: Exchange CIS2 access token for an Apigee access token
    logger.info("Preparing to exchange CIS2 access token for Apigee access token")

    // Fetch the private key for signing the client assertion
    logger.info("Accessing JWT private key from Secrets Manager to create signed client assertion")
    const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
    if (!jwtPrivateKey || typeof jwtPrivateKey !== "string") {
      throw new Error("Invalid or missing JWT private key")
    }

    // Construct the token exchange payload
    const tokenExchangeData = {
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      subject_token: cis2AccessToken,
      client_id: "clinical-prescription-tracker-client" //process.env["oidcClientId"]
    }

    // Rewrite payload to include the signed JWT client assertion
    logger.info("Generating signed JWT for Apigee token exchange payload")
    const rewrittenBody = rewriteBodyToAddSignedJWT(
      logger,
      tokenExchangeData,
      apigeeTokenEndpoint,
      jwtPrivateKey,
      apigeeApiKey
    )
    logger.info("Rewritten body for Apigee token exchange", {rewrittenBody})

    try {
      logger.info("Sending request to Apigee token endpoint", {apigeeTokenEndpoint})

      // Make the token exchange request
      const tokenResponse = await axiosInstance.post(apigeeTokenEndpoint, stringify(rewrittenBody), {
        headers: {"Content-Type": "application/x-www-form-urlencoded"}
      })

      if (!tokenResponse.data || !tokenResponse.data.access_token) {
        logger.error("Invalid response from Apigee token endpoint", {tokenResponse})
        throw new Error("Invalid response from Apigee token endpoint")
      }

      apigeeAccessToken = tokenResponse.data.access_token

      logger.info("Successfully exchanged token", {apigeeAccessToken, expiresIn: tokenResponse.data.expires_in})

      // Step 3: Update DynamoDB with new Apigee access token
      const currentTime = Math.floor(Date.now() / 1000)
      logger.info("Updating DynamoDB with new Apigee access token", {apigeeAccessToken})
      await documentClient.send(
        new UpdateCommand({
          TableName: TokenMappingTableName,
          Key: {username: event.requestContext.authorizer?.claims?.["cognito:username"] || "unknown"},
          UpdateExpression: "SET Apigee_accessToken = :apigeeAccessToken, Apigee_expiresIn = :apigeeExpiresIn",
          ExpressionAttributeValues: {
            ":apigeeAccessToken": apigeeAccessToken,
            ":apigeeExpiresIn": currentTime + (tokenResponse.data.expires_in || 3600)
          }
        })
      )

      logger.info("Apigee access token successfully updated in DynamoDB")
    } catch (error) {
      if (axios.isAxiosError(error)) {
        handleAxiosError(error, "Token exchange failed")
      } else {
        logger.error("Unexpected non-Axios error during token exchange", {error})
      }
      throw new Error("Error during token exchange")
    }
  } catch (error) {
    logger.error("Error during token exchange or DynamoDB operations", {error})
    return handleErrorResponse(error, "Error during token operations")
  }

  // Step 4: Fetch prescription data from Apigee API
  const prescriptionId = event.queryStringParameters?.prescriptionId || "defaultId"

  // Error handling for fetching prescription data
  try {
    logger.info("Fetching prescription data from Apigee", {prescriptionId})
    const apigeeResponse = await axiosInstance.get(
      `${apigeePrescriptionsEndpoint}/prescription-search/${prescriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${apigeeAccessToken}`,
          "NHSD-Session-URID": roleId
        }
      }
    )

    logger.info("Successfully fetched prescription data from Apigee", {prescriptionId, data: apigeeResponse.data})
    return {
      statusCode: 200,
      body: JSON.stringify(apigeeResponse.data),
      headers: formatHeaders(apigeeResponse.headers)
    }
  } catch (error) {
    logger.error("Error fetching prescription data from Apigee", {
      prescriptionId,
      error: axios.isAxiosError(error) ? error.response?.data : error
    })
    return handleErrorResponse(error, "Failed to fetch prescription data from Apigee API")
  }
}

const handleAxiosError = (error: AxiosError, contextMessage: string) => {
  if (axios.isAxiosError(error)) {
    const config: Partial<AxiosError["config"]> = error.config || {}
    logger.error(contextMessage, {
      message: error.message,
      status: error.response?.status,
      responseData: error.response?.data,
      responseHeaders: error.response?.headers,
      requestConfig: {
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: config.data
      }
    })
  } else {
    logger.error("Unexpected error during Axios request", {error})
  }
}

const handleErrorResponse = (error: unknown, defaultMessage: string): APIGatewayProxyResult => {
  if (axios.isAxiosError(error)) {
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({
        message: defaultMessage,
        details: error.response?.data || error.message
      })
    }
  }

  return {
    statusCode: 500,
    body: JSON.stringify({
      message: defaultMessage,
      details: error instanceof Error ? error.message : "Unknown error occurred"
    })
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
