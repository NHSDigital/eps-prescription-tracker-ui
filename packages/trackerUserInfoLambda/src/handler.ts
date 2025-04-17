import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import axios from "axios"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {
  getUsernameFromEvent,
  fetchAndVerifyCIS2Tokens,
  initializeOidcConfig,
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken,
  updateApigeeAccessToken,
  getExistingApigeeAccessToken
} from "@cpt-ui-common/authFunctions"
import {fetchUserInfo, updateDynamoTable, fetchDynamoTable} from "./userInfoHelpers"

/*
This is the lambda code to get user info
It expects the following environment variables to be set

CIS2_OIDC_ISSUER
CIS2_OIDC_CLIENT_ID
CIS2_OIDCJWKS_ENDPOINT
CIS2_USER_INFO_ENDPOINT
CIS2_USER_POOL_IDP

TokenMappingTableName
MOCK_MODE_ENABLED

For mock calls, the following must be set
MOCK_OIDC_ISSUER
MOCK_OIDC_CLIENT_ID
MOCK_OIDCJWKS_ENDPOINT
MOCK_USER_INFO_ENDPOINT
MOCK_USER_POOL_IDP
*/
const logger = new Logger({serviceName: "trackerUserInfo"})

const dynamoClient = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

// Create a config for cis2 and mock
// this is outside functions so it can be re-used and caching works
const {mockOidcConfig, cis2OidcConfig} = initializeOidcConfig()

// External endpoints and environment variables
const apigeeCIS2TokenEndpoint = process.env["apigeeCIS2TokenEndpoint"] as string
const apigeeMockTokenEndpoint = process.env["apigeeMockTokenEndpoint"] as string
const tokenMappingTableName = process.env["TokenMappingTableName"] ?? ""
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const apigeeApiKey = process.env["apigeeApiKey"] as string
const jwtKid = process.env["jwtKid"] as string
const MOCK_MODE_ENABLED = process.env["MOCK_MODE_ENABLED"]
// let roleId = process.env["roleId"] as string

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const CPT_ACCESS_ACTIVITY_CODES = ["B0570", "B0278"]

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  const axiosInstance = axios.create()

  // Mock usernames start with "Mock_", and real requests use usernames starting with "Primary_"
  const username = getUsernameFromEvent(event)
  const isMockToken = username.startsWith("Mock_")

  // Determine whether this request should be treated as mock or real.
  if (isMockToken && MOCK_MODE_ENABLED !== "true") {
    throw new Error("Trying to use a mock user when mock mode is disabled")
  }

  const isMockRequest = MOCK_MODE_ENABLED === "true" && isMockToken
  const apigeeTokenEndpoint = isMockRequest ? apigeeMockTokenEndpoint : apigeeCIS2TokenEndpoint
  const oidcConfig = isMockRequest ? mockOidcConfig : cis2OidcConfig

  logger.info("Is this a mock request?", {isMockRequest})
  logger.info("oidc config:", {oidcConfig})

  // Fetch user info from DynamoDB
  const cachedUserInfo = await fetchDynamoTable(username, documentClient, logger, tokenMappingTableName)

  // Check if cached data exists and has valid role information
  if (
    cachedUserInfo &&
      (cachedUserInfo.roles_with_access.length > 0 || cachedUserInfo.roles_without_access.length > 0)
  ) {
    logger.info("Returning cached user info from DynamoDB", {cachedUserInfo})

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "UserInfo fetched successfully from DynamoDB",
        userInfo: cachedUserInfo
      })
    }
  }

  logger.info("No valid cached user info found. Fetching from OIDC UserInfo endpoint...")

  let apigeeAccessToken: string | undefined
  let cis2IdToken: string | undefined

  if (isMockRequest) {
    logger.info("Mock mode detected, checking for existing Apigee token")
    const existingToken = await getExistingApigeeAccessToken(
      documentClient,
      tokenMappingTableName,
      username,
      logger
    )

    if (existingToken) {
      // Use existing token if valid
      logger.info("Using existing Apigee access token in mock mode")
      apigeeAccessToken = existingToken.accessToken
      cis2IdToken = existingToken.idToken
    }
  }

  // If we don't have a valid token yet, go through the token exchange flow
  if (!apigeeAccessToken) {
    logger.info(`Obtaining new Apigee token (${isMockRequest ? "mock" : "real"} mode)`)

    // Get CIS2 tokens
    const tokensResult = await fetchAndVerifyCIS2Tokens(
      event,
      documentClient,
      logger,
      oidcConfig
    )

    cis2IdToken = tokensResult.cis2IdToken
    logger.debug("Successfully fetched CIS2 tokens", {
      cis2AccessToken: tokensResult.cis2AccessToken,
      cis2IdToken
    })

    // Fetch the private key for signing the client assertion
    logger.info("Accessing JWT private key from Secrets Manager to create signed client assertion")
    const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
    if (!jwtPrivateKey || typeof jwtPrivateKey !== "string") {
      throw new Error("Invalid or missing JWT private key")
    }

    // Construct a new body with the signed JWT client assertion
    const requestBody = constructSignedJWTBody(
      logger,
      apigeeTokenEndpoint,
      jwtPrivateKey,
      apigeeApiKey,
      jwtKid,
      cis2IdToken
    )

    // Exchange token with Apigee
    const tokenResult = await exchangeTokenForApigeeAccessToken(
      axiosInstance,
      apigeeTokenEndpoint,
      requestBody,
      logger
    )

    // Update DynamoDB with the new Apigee access token
    await updateApigeeAccessToken(
      documentClient,
      tokenMappingTableName,
      username,
      tokenResult.accessToken,
      tokenResult.expiresIn,
      logger
    )

    apigeeAccessToken = tokenResult.accessToken
  }

  // If we still don't have tokens, we need to get them
  if (!cis2IdToken) {
    // Get CIS2 tokens if we don't have them yet (e.g., when using cached Apigee token)
    const tokensResult = await fetchAndVerifyCIS2Tokens(
      event,
      documentClient,
      logger,
      oidcConfig
    )
    cis2IdToken = tokensResult.cis2IdToken
  }

  if (!apigeeAccessToken || !cis2IdToken) {
    throw new Error("Failed to obtain required tokens")
  }

  const userInfoResponse = await fetchUserInfo(
    apigeeAccessToken,
    cis2IdToken,
    CPT_ACCESS_ACTIVITY_CODES,
    logger,
    oidcConfig
  )

  // Store the new data in DynamoDB, making sure not to override the apigeeAccessToken
  await updateDynamoTable(username, userInfoResponse, documentClient, logger, tokenMappingTableName)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "UserInfo fetched successfully from the OIDC endpoint",
      userInfo: userInfoResponse
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
