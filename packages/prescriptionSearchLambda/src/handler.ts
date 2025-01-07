import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import axios from "axios"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {formatHeaders} from "./utils/headerUtils"
import {handleErrorResponse} from "./utils/errorUtils"
import {v4 as uuidv4} from "uuid"
import {
  getUsernameFromEvent,
  fetchAndVerifyCIS2Tokens,
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken,
  updateApigeeAccessToken
} from "@cpt-ui-common/authFunctions"

// Logger initialization
const logger = new Logger({serviceName: "prescriptionSearch"})

// External endpoints and environment variables
const apigeeCIS2TokenEndpoint = process.env["apigeeCIS2TokenEndpoint"] as string
const apigeeMockTokenEndpoint = process.env["apigeeMockTokenEndpoint"] as string
const apigeePrescriptionsEndpoint = process.env["apigeePrescriptionsEndpoint"] as string
const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const apigeeApiKey = process.env["apigeeApiKey"] as string
const jwtKid = process.env["jwtKid"] as string
const roleId = process.env["roleId"] as string
const MOCK_MODE_ENABLED = process.env["MOCK_MODE_ENABLED"]

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
  let prescriptionId: string | undefined

  try {
    // Mock usernames start with "Mock_", and real requests use usernames starting with "Primary_"
    const username = getUsernameFromEvent(event)
    const isMockToken = username.startsWith("Mock_")
    // Determine whether this request should be treated as mock or real.
    const isMockRequest = MOCK_MODE_ENABLED === "true" && isMockToken

    const apigeeTokenEndpoint = isMockRequest
      ? apigeeMockTokenEndpoint
      : apigeeCIS2TokenEndpoint

    logger.info("Is this a mock request?", {isMockRequest})

    // Step 1: Fetch CIS2 tokens
    logger.info("Retrieving CIS2 tokens from DynamoDB based on the current request context")
    const {cis2AccessToken, cis2IdToken} = await fetchAndVerifyCIS2Tokens(event, documentClient, logger, isMockRequest)
    logger.debug("Successfully fetched CIS2 tokens", {cis2AccessToken, cis2IdToken})

    // Step 2: Fetch the private key for signing the client assertion
    logger.info("Accessing JWT private key from Secrets Manager to create signed client assertion")
    const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
    if (!jwtPrivateKey || typeof jwtPrivateKey !== "string") {
      throw new Error("Invalid or missing JWT private key")
    }

    logger.debug("JWT private key retrieved successfully")

    // Construct a new body with the signed JWT client assertion
    logger.info("Generating signed JWT for Apigee token exchange payload")
    const requestBody = constructSignedJWTBody(
      logger,
      apigeeTokenEndpoint,
      jwtPrivateKey,
      apigeeApiKey,
      jwtKid,
      cis2IdToken
    )
    logger.debug("Constructed request body for Apigee token exchange", {requestBody})

    // Step 3: Exchange token with Apigee
    const {accessToken: apigeeAccessToken, expiresIn} = await exchangeTokenForApigeeAccessToken(
      axiosInstance,
      apigeeTokenEndpoint,
      requestBody,
      logger
    )

    // Step 4: Update DynamoDB with the new Apigee access token
    await updateApigeeAccessToken(
      documentClient,
      TokenMappingTableName,
      event.requestContext.authorizer?.claims?.["cognito:username"] || "unknown",
      apigeeAccessToken,
      expiresIn,
      logger
    )

    // Step 5: Fetch prescription data from Apigee API
    prescriptionId = event.queryStringParameters?.prescriptionId || "defaultId"

    logger.info("Fetching prescription data from Apigee", {prescriptionId})
    // need to pass in role id, organization id and job role to apigee
    // user id is retrieved in apigee from access token
    const apigeeResponse = await axiosInstance.get(apigeePrescriptionsEndpoint,
      {
        params: {
          prescriptionId: prescriptionId
        },
        headers: {
          Authorization: `Bearer ${apigeeAccessToken}`,
          "nhsd-session-urid": roleId,
          "nhsd-organization-uuid": "A83008",
          "nhsd-session-jobrole": "123456123456",
          "x-request-id": uuidv4()
        }
      }
    )

    logger.info("Successfully fetched prescription data from Apigee", {
      prescriptionId,
      data: apigeeResponse.data
    })
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
