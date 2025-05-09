import {APIGatewayProxyEvent} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import axios from "axios"
import {initializeOidcConfig, OidcConfig, refreshApigeeAccessToken} from "./index"

import {
  getUsernameFromEvent,
  fetchAndVerifyCIS2Tokens,
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken,
  updateApigeeAccessToken,
  getExistingApigeeAccessToken
} from "./index"

// Define the ApigeeTokenResponse type
interface ApigeeTokenResponse {
  accessToken: string
  refreshToken?: string
  expiresIn: number
}

// Create axios instance
const axiosInstance = axios.create()

/**
 * Represents the result of a successful authentication
 */
export interface AuthResult {
  username: string
  apigeeAccessToken: string
  cis2IdToken: string
  roleId?: string
  isMockRequest: boolean
}

/**
 * Options for the authenticateRequest function
 */
export interface AuthenticateRequestOptions {
  tokenMappingTableName: string
  jwtPrivateKeyArn: string
  apigeeApiKey: string
  apigeeApiSecret: string
  jwtKid: string
  oidcConfig: OidcConfig
  mockModeEnabled: boolean
  apigeeTokenEndpoint: string
}

export const initializeAuthConfig = () => {
  const {mockOidcConfig, cis2OidcConfig} = initializeOidcConfig()
  const cis2ApigeeTokenEndpoint = process.env["apigeeCIS2TokenEndpoint"] as string
  const apigeeMockTokenEndpoint = process.env["apigeeMockTokenEndpoint"] as string
  const tokenMappingTableName = process.env["TokenMappingTableName"] ?? ""
  const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
  const apigeeApiKey = process.env["APIGEE_API_KEY"] as string
  const apigeeApiSecret = process.env["APIGEE_API_SECRET"] as string
  const jwtKid = process.env["jwtKid"] as string
  const MOCK_MODE_ENABLED = process.env["MOCK_MODE_ENABLED"] === "true"
  return {
    tokenMappingTableName,
    jwtPrivateKeyArn,
    apigeeApiKey,
    apigeeApiSecret,
    jwtKid,
    oidcConfig: MOCK_MODE_ENABLED ? mockOidcConfig : cis2OidcConfig,
    mockModeEnabled: MOCK_MODE_ENABLED,
    apigeeTokenEndpoint: MOCK_MODE_ENABLED ? apigeeMockTokenEndpoint : cis2ApigeeTokenEndpoint
  }
}

const refreshTokenFlow = async (
  documentClient: DynamoDBDocumentClient,
  tokenMappingTableName: string,
  username: string,
  refreshToken: string,
  logger: Logger,
  config: {
    jwtPrivateKeyArn: string
    apigeeApiKey: string
    apigeeApiSecret: string
    jwtKid: string
    apigeeTokenEndpoint: string
    mockModeEnabled: boolean
  }
): Promise<ApigeeTokenResponse> => {
  try {
    const refreshResult = await refreshApigeeAccessToken(
      axiosInstance,
      config.apigeeTokenEndpoint,
      refreshToken,
      config.apigeeApiKey,
      config.apigeeApiSecret,
      logger
    )

    // Update DynamoDB with the new tokens
    await updateApigeeAccessToken(
      documentClient,
      tokenMappingTableName,
      username,
      refreshResult.accessToken,
      refreshResult.refreshToken,
      refreshResult.expiresIn,
      logger
    )

    logger.info("Successfully refreshed tokens")
    return refreshResult
  } catch (error) {
    logger.warn("Token refresh failed", {error})
    throw error
  }
}

/**
 * Authenticates a request and handles the entire authentication flow including token refresh.
 *
 * @param event - API Gateway proxy event
 * @param documentClient - DynamoDB document client
 * @param logger - Logger instance
 * @param options - Authentication options
 * @returns Authentication result containing tokens and metadata
 */
export async function authenticateRequest(
  event: APIGatewayProxyEvent,
  documentClient: DynamoDBDocumentClient,
  logger: Logger,
  options: AuthenticateRequestOptions
): Promise<{
  username: string
  apigeeAccessToken: string
  roleId: string
}> {
  const {
    tokenMappingTableName,
    jwtPrivateKeyArn,
    apigeeApiKey,
    apigeeApiSecret,
    jwtKid,
    oidcConfig,
    mockModeEnabled,
    apigeeTokenEndpoint
  } = options

  logger.info("Starting authentication flow")

  // Extract username and determine if this is a mock request
  const username = getUsernameFromEvent(event)
  const isMockRequest = username.startsWith("Mock_")

  //Get the existing saved Apigee token from DynamoDB
  const existingToken = await getExistingApigeeAccessToken(
    documentClient,
    tokenMappingTableName,
    username,
    logger
  )

  // If token exists, check if we need to refresh it
  if (existingToken?.accessToken) {
    const currentTime = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = existingToken.expiresIn - currentTime

    // If token is expired or will expire soon (within 60 seconds), refresh it
    if (timeUntilExpiry <= 60) {
      logger.info("Token needs refresh, initiating token refresh flow")
      try {
        const refreshedToken = await refreshTokenFlow(
          documentClient,
          tokenMappingTableName,
          username,
          existingToken.refreshToken,
          logger,
          {
            jwtPrivateKeyArn,
            apigeeApiKey,
            apigeeApiSecret,
            jwtKid,
            apigeeTokenEndpoint,
            mockModeEnabled
          }
        )

        return {
          username,
          apigeeAccessToken: refreshedToken.accessToken,
          roleId: existingToken.roleId || ""
        }
      } catch (error) {
        logger.warn("Token refresh failed, will proceed with new token acquisition", {error})
        // Continue to the token acquisition flow if refresh fails
      }
    } else {
      // Token is still valid, use it
      logger.info("Using existing valid token", {
        timeUntilExpiry,
        username
      })

      return {
        username,
        apigeeAccessToken: existingToken.accessToken,
        roleId: existingToken.roleId || ""
      }
    }
  }

  // No valid existing token found or refresh failed, need to acquire a new one
  logger.info(`Obtaining tokens through ${isMockRequest ? "mock" : "standard"} flow`)

  // In mock mode, we don't expect to reach this point normally
  // since authentication should have created tokens
  if (isMockRequest && !existingToken) {
    logger.warn("Mock mode enabled but no valid token exists or refresh failed.")
    logger.info("This is an unexpected state in mock mode.")
    throw new Error("Unexpected state in mock mode")
  }

  // When we aren't mocking, get CIS2 tokens and exchange for Apigee token
  const {cis2AccessToken, cis2IdToken} = await fetchAndVerifyCIS2Tokens(
    event,
    documentClient,
    logger,
    oidcConfig
  )

  logger.debug("Successfully fetched CIS2 tokens", {
    cis2AccessToken: cis2AccessToken,
    cis2IdToken: cis2IdToken ? "[REDACTED]" : undefined
  })

  // Fetch the private key for signing the client assertion
  logger.info("Fetching JWT private key from Secrets Manager")
  const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
  if (!jwtPrivateKey || typeof jwtPrivateKey !== "string") {
    throw new Error("Invalid or missing JWT private key")
  }

  // Construct a new body with the signed JWT client assertion
  const requestBody = constructSignedJWTBody(
    logger,
    oidcConfig.oidcTokenEndpoint,
    jwtPrivateKey,
    apigeeApiKey,
    jwtKid,
    cis2IdToken
  )

  // Exchange token with Apigee
  const {accessToken, refreshToken, expiresIn} = await exchangeTokenForApigeeAccessToken(
    axiosInstance,
    oidcConfig.oidcTokenEndpoint,
    requestBody,
    logger
  )

  // Update DynamoDB with the new Apigee access token
  await updateApigeeAccessToken(
    documentClient,
    tokenMappingTableName,
    username,
    accessToken,
    refreshToken,
    expiresIn,
    logger
  )

  // Validate that we have the tokens we need
  if (!accessToken) {
    throw new Error("Failed to obtain required tokens after authentication flow")
  }

  logger.info("Authentication flow completed successfully", {
    username,
    hasApigeeToken: !!accessToken
  })

  return {
    username,
    apigeeAccessToken: accessToken,
    roleId: ""
  }
}
