import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {AxiosInstance} from "axios"
import {
  refreshApigeeAccessToken,
  verifyIdToken,
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken
} from "./index"
import {deleteTokenMapping, updateTokenMapping, TokenMappingItem} from "@cpt-ui-common/dynamoFunctions"

// Define the ApigeeTokenResponse type
interface ApigeeTokenResponse {
  accessToken: string
  idToken?: string
  refreshToken?: string
  expiresIn: number
}

/**
 * Represents the result of a successful authentication
 */
export interface AuthResult {
  username: string
  apigeeAccessToken: string
  roleId?: string
  orgCode?: string
  sessionId?: string
  isConcurrentSession?: boolean
}

/**
 * Options for the authenticateRequest function
 */
export interface AuthenticateRequestOptions {
  tokenMappingTableName: string
  sessionManagementTableName: string
  jwtPrivateKeyArn: string
  apigeeApiKey: string
  apigeeApiSecret: string
  jwtKid: string
  apigeeCis2TokenEndpoint: string
  apigeeMockTokenEndpoint: string
  cloudfrontDomain: string
}

export const authParametersFromEnv = (): AuthenticateRequestOptions => {
  return {
    tokenMappingTableName: process.env["TokenMappingTableName"] as string,
    sessionManagementTableName: process.env["SessionManagementTableName"] as string,
    jwtPrivateKeyArn: process.env["jwtPrivateKeyArn"] as string,
    apigeeApiKey: process.env["APIGEE_API_KEY"] as string,
    apigeeApiSecret: process.env["APIGEE_API_SECRET"] as string,
    jwtKid: process.env["jwtKid"] as string,
    apigeeMockTokenEndpoint: process.env["apigeeMockTokenEndpoint"] as string,
    apigeeCis2TokenEndpoint: process.env["apigeeCIS2TokenEndpoint"] as string,
    cloudfrontDomain: process.env["FULL_CLOUDFRONT_DOMAIN"] as string
  }
}

const refreshTokenFlow = async (
  axiosInstance: AxiosInstance,
  documentClient: DynamoDBDocumentClient,
  specifiedTokenTable: string,
  username: string,
  existingToken: ApigeeTokenResponse,
  logger: Logger,
  config: {
    isMockRequest: boolean,
    jwtPrivateKeyArn: string
    apigeeApiKey: string
    apigeeApiSecret: string
    jwtKid: string
    apigeeTokenEndpoint: string
  },
  lastActivityTime: number
): Promise<ApigeeTokenResponse> => {
  if (existingToken.refreshToken === undefined) {
    throw new Error("Missing refresh token")
  }
  const refreshResult = await refreshApigeeAccessToken(
    axiosInstance,
    config.apigeeTokenEndpoint,
    existingToken.refreshToken,
    config.apigeeApiKey,
    config.apigeeApiSecret,
    logger
  )

  // Update DynamoDB with the new tokens
  await updateTokenMapping(
    documentClient,
    specifiedTokenTable,
    {
      username,
      apigeeAccessToken: refreshResult.accessToken,
      apigeeExpiresIn: refreshResult.expiresIn,
      apigeeRefreshToken: refreshResult.refreshToken,
      lastActivityTime: lastActivityTime
    },
    logger
  )

  logger.info("Successfully refreshed tokens")
  return refreshResult
}

const fifteenMinutes = 15 * 60 * 1000

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
  username: string,
  axiosInstance: AxiosInstance,
  documentClient: DynamoDBDocumentClient,
  logger: Logger,
  {
    jwtPrivateKeyArn,
    apigeeApiKey,
    apigeeApiSecret,
    jwtKid,
    apigeeMockTokenEndpoint,
    apigeeCis2TokenEndpoint,
    cloudfrontDomain
  }: AuthenticateRequestOptions,
  userRecord: TokenMappingItem,
  specifiedTokenTable: string,
  disableLastActivityUpdate: boolean
): Promise<AuthResult | null> {
  logger.info("Starting authentication flow")

  // Extract username and determine if this is a mock request
  const isMockRequest = username.startsWith("Mock_")

  // If disableTokenRefresh is true, we won't update lastActivityTime
  const lastActivityTime = disableLastActivityUpdate ? userRecord.lastActivityTime : Date.now()

  if (Date.now() - userRecord.lastActivityTime > fifteenMinutes) {
    logger.info("Last activity was more than 15 minutes ago, clearing user record")
    await deleteTokenMapping(
      documentClient,
      specifiedTokenTable,
      username,
      logger
    )

    return null
  }

  // If token exists, check if we need to refresh it
  if (userRecord.apigeeAccessToken) {
    const currentTime = Math.floor(Date.now() / 1000)
    if (userRecord.apigeeExpiresIn === undefined) {
      throw new Error("Missing apigee expires in time")
    }
    const timeUntilExpiry = userRecord.apigeeExpiresIn - currentTime

    // If token is expired or will expire soon (within 60 seconds), refresh it
    if (timeUntilExpiry <= 60) {
      logger.info("Token needs refresh, initiating token refresh flow")
      try {
        const refreshedToken = await refreshTokenFlow(
          axiosInstance,
          documentClient,
          specifiedTokenTable,
          username,
          {
            accessToken: userRecord.apigeeAccessToken,
            refreshToken: userRecord.apigeeRefreshToken,
            expiresIn: userRecord.apigeeExpiresIn
          },
          logger,
          {
            isMockRequest,
            jwtPrivateKeyArn,
            apigeeApiKey,
            apigeeApiSecret,
            jwtKid,
            apigeeTokenEndpoint: isMockRequest ? apigeeMockTokenEndpoint : apigeeCis2TokenEndpoint
          },
          lastActivityTime
        )

        return {
          username,
          apigeeAccessToken: refreshedToken.accessToken,
          roleId: userRecord.currentlySelectedRole?.role_id,
          orgCode: userRecord.currentlySelectedRole?.org_code
        }
      } catch (error) {
        logger.warn("Token refresh failed, will proceed with new token acquisition", {error})
        // Continue to the token acquisition flow if refresh fails
      }
    } else {
      // Token is still valid, use it
      logger.info("Using existing valid token", {
        timeUntilExpiry,
        isMockRequest
      })

      // Don't update last activity time if token refresh is disabled
      await updateTokenMapping(
          documentClient,
          specifiedTokenTable,
          {username, lastActivityTime: lastActivityTime},
          logger
        )

      return {
        username,
        apigeeAccessToken: userRecord.apigeeAccessToken,
        roleId: userRecord.currentlySelectedRole?.role_id,
        orgCode: userRecord.currentlySelectedRole?.org_code
      }
    }
  }

  // No valid existing token found or refresh failed, need to acquire a new one
  logger.info(`Obtaining tokens through ${isMockRequest ? "mock" : "standard"} flow`)

  let exchangeResult
  if (isMockRequest) {
    // for mock request we need to call apigee userinfo endpoint
    // we also need to include the callback url registered for our apigee app
    // for pull requests, this is the domain name for the environment (without -pr-XXX)

    const baseEnvironmentDomain = cloudfrontDomain.replace(/-pr-(\d*)/, "")
    const callbackUri = `https://${baseEnvironmentDomain}/oauth2/mock-callback`
    const tokenExchangeBody = {
      grant_type: "authorization_code",
      client_id: apigeeApiKey,
      client_secret: apigeeApiSecret,
      redirect_uri: callbackUri,
      code: userRecord.apigeeCode
    }
    exchangeResult = await exchangeTokenForApigeeAccessToken(
      axiosInstance,
      apigeeMockTokenEndpoint,
      tokenExchangeBody,
      logger
    )
  } else {
    // When we aren't mocking, get CIS2 tokens and exchange for Apigee token
    if (userRecord.cis2IdToken === undefined) {
      throw new Error("Missing cis2IdToken")
    }
    await verifyIdToken(userRecord.cis2IdToken, logger)

    // Fetch the private key for signing the client assertion
    logger.info("Fetching JWT private key from Secrets Manager", {jwtPrivateKeyArn})
    const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
    if (!jwtPrivateKey || typeof jwtPrivateKey !== "string") {
      throw new Error("Invalid or missing JWT private key")
    }

    // Construct a new body with the signed JWT client assertion
    const requestBody = constructSignedJWTBody(
      logger,
      apigeeCis2TokenEndpoint,
      jwtPrivateKey,
      apigeeApiKey,
      jwtKid,
      userRecord.cis2IdToken
    )

    // Exchange token with Apigee
    exchangeResult = await exchangeTokenForApigeeAccessToken(
      axiosInstance,
      apigeeCis2TokenEndpoint,
      requestBody,
      logger
    )

  }

  // Update DynamoDB with the new Apigee access token
  await updateTokenMapping(
    documentClient,
    specifiedTokenTable,
    {
      username,
      apigeeAccessToken: exchangeResult.accessToken,
      apigeeRefreshToken: exchangeResult.refreshToken,
      apigeeExpiresIn: exchangeResult.expiresIn,
      lastActivityTime: lastActivityTime
    },
    logger
  )

  // Validate that we have the tokens we need
  if (!exchangeResult.accessToken) {
    throw new Error("Failed to obtain required tokens after authentication flow")
  }

  logger.info("Authentication flow completed successfully")
  logger.debug("Authentication result", {
    authResult: {
      accessToken: exchangeResult.accessToken,
      refreshToken: exchangeResult.refreshToken,
      expiresIn: exchangeResult.expiresIn
    }
  })

  // at this point we may or may not have a selected role
  return {
    username,
    apigeeAccessToken: exchangeResult.accessToken,
    roleId: userRecord.currentlySelectedRole?.role_id,
    orgCode: userRecord.currentlySelectedRole?.org_code
  }
}
