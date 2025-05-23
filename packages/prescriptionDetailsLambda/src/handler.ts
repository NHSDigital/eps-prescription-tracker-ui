import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"

import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import axios from "axios"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"

import {
  getUsernameFromEvent,
  fetchAndVerifyCIS2Tokens,
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken,
  updateApigeeAccessToken,
  initializeOidcConfig
} from "@cpt-ui-common/authFunctions"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import {processPrescriptionRequest} from "./utils/prescriptionService"

// Logger initialization
const logger = new Logger({serviceName: "prescriptionDetails"})

// External endpoints and environment variables
const apigeeCIS2TokenEndpoint = process.env["apigeeCIS2TokenEndpoint"] as string
const apigeeMockTokenEndpoint = process.env["apigeeMockTokenEndpoint"] as string

// TODO: Replace hardcoded value with environment variable before production
// The Apigee API base endpoint for prescription tracking
// const apigeePrescriptionsEndpoint = process.env["apigeePrescriptionsEndpoint"] as string
const apigeePrescriptionsEndpoint = "https://internal-dev.api.service.nhs.uk/clinical-prescription-tracker-pr-809/"

const TokenMappingTableName = process.env["TokenMappingTableName"] as string

const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const jwtKid = process.env["jwtKid"] as string

const apigeeApiKey = process.env["apigeeApiKey"] as string
const roleId = process.env["roleId"] as string

// DynamoDB client setup
const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

// Create a config for cis2 and mock
// this is outside functions so it can be re-used and caching works
const {mockOidcConfig, cis2OidcConfig} = initializeOidcConfig()

// Error response template
const errorResponseBody = {message: "A system error has occurred"}

// Middleware error handler
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Attach request ID for tracing
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  const axiosInstance = axios.create()

  const MOCK_MODE_ENABLED = process.env["MOCK_MODE_ENABLED"]

  // ****************************************
  // SETUP
  // ****************************************

  // Mock usernames start with "Mock_", and real requests use usernames starting with "Primary_"
  const username = getUsernameFromEvent(event)
  const isMockToken = username.startsWith("Mock_")

  // Determine whether this request should be treated as mock or real.
  if (isMockToken && MOCK_MODE_ENABLED !== "true") {
    throw new Error("Trying to use a mock user when mock mode is disabled")
  }
  const isMockRequest = MOCK_MODE_ENABLED === "true" && isMockToken

  const apigeeTokenEndpoint = isMockRequest
    ? apigeeMockTokenEndpoint
    : apigeeCIS2TokenEndpoint

  logger.info("Is this a mock request?", {isMockRequest})

  // Fetch the private key for signing the client assertion
  const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
  if (!jwtPrivateKey || typeof jwtPrivateKey !== "string") {
    throw new Error("Invalid or missing JWT private key")
  }
  logger.info("JWT private key retrieved successfully")

  // ****************************************
  // TOKEN EXCHANGE & AUTH FLOW
  // ****************************************

  // Fetch CIS2 tokens
  const {cis2AccessToken, cis2IdToken} = await fetchAndVerifyCIS2Tokens(
    event,
    documentClient,
    logger,
    isMockRequest ? mockOidcConfig : cis2OidcConfig
  )
  logger.info("Successfully fetched CIS2 tokens", {cis2AccessToken, cis2IdToken})

  // Construct a new body with the signed JWT client assertion
  const requestBody = constructSignedJWTBody(
    logger,
    apigeeTokenEndpoint,
    jwtPrivateKey,
    apigeeApiKey,
    jwtKid,
    cis2IdToken
  )
  logger.info("Constructed request body for Apigee token exchange", {requestBody})

  // Exchange token with Apigee
  const {accessToken: apigeeAccessToken, expiresIn} = await exchangeTokenForApigeeAccessToken(
    axiosInstance,
    apigeeTokenEndpoint,
    requestBody,
    logger
  )

  // Update DynamoDB with the new Apigee access token
  await updateApigeeAccessToken(
    documentClient,
    TokenMappingTableName,
    event.requestContext.authorizer?.claims?.["cognito:username"] || "unknown",
    apigeeAccessToken,
    expiresIn,
    logger
  )

  // ****************************************
  // PROCESS REQUEST
  // ****************************************

  // Pass the gathered data in to the processor for the request
  return await processPrescriptionRequest(
    event,
    apigeePrescriptionsEndpoint,
    apigeeAccessToken,
    roleId,
    logger
  )
}

// Export the Lambda function with middleware applied
export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(inputOutputLogger({logger: (request) => logger.info(request)}))
  .use(middyErrorHandler.errorHandler({logger}))
