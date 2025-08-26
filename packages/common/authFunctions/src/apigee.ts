import {Logger} from "@aws-lambda-powertools/logger"
import jwt from "jsonwebtoken"
import {v4 as uuidv4} from "uuid"
import axios, {AxiosInstance} from "axios"
import {ParsedUrlQuery, stringify} from "querystring"
import {handleAxiosError} from "./errorUtils"

/**
 * Build the headers needed for the Apigee request.
 */
export function buildApigeeHeaders(apigeeAccessToken: string, roleId: string, orgCode: string,
  correlationId: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apigeeAccessToken}`,
    "nhsd-session-urid": roleId,
    "x-request-id": uuidv4(),
    "nhsd-session-jobrole": roleId,
    "nhsd-identity-uuid": roleId, //TODO potentially remove this line
    "nhsd-organization-uuid": orgCode,
    "x-correlation-id": correlationId
  }
}

/**
 * Constructs a new body for the token exchange, including a signed JWT
 * @param logger - Logger instance for logging
 * @param objectBodyParameters - Original body parameters
 * @param idpTokenPath - Token endpoint
 * @param jwtPrivateKey - Private key for signing the JWT
 * @param apigeeApiKey - API key for Apigee
 * @param jwtKid - Key ID for the JWT
 * @returns Modified body with signed JWT included
 */
export function constructSignedJWTBody(
  logger: Logger,
  idpTokenPath: string,
  jwtPrivateKey: jwt.PrivateKey,
  apigeeApiKey: string,
  jwtKid: string,
  cis2IdToken: string
): ParsedUrlQuery {
  logger.info("Constructing new body to include signed JWT", {idpTokenPath})

  const current_time = Math.floor(Date.now() / 1000)
  const expiration_time = current_time + 300

  const claims = {
    iss: apigeeApiKey,
    sub: apigeeApiKey,
    aud: idpTokenPath,
    iat: current_time,
    exp: expiration_time,
    jti: uuidv4()
  }

  const signOptions: jwt.SignOptions = {
    algorithm: "RS512",
    header: {
      alg: "RS512",
      typ: "JWT",
      kid: jwtKid
    }
  }

  logger.debug("JWT claims prepared for signing", {claims})
  const jwt_token = jwt.sign(claims, jwtPrivateKey, signOptions)
  logger.info("Generated JWT token", {jwt_token})

  const requestBody = {
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: jwt_token,
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
    subject_token: cis2IdToken,
    client_id: "clinical-prescription-tracker-client"
  }

  return requestBody
}

/**
 * Makes a request to the Apigee token endpoint to exchange a token.
 * @param axiosInstance - Axios instance for making HTTP requests
 * @param apigeeTokenEndpoint - Apigee token endpoint URL
 * @param requestBody - Body of the token exchange request
 * @param logger - Logger instance for logging
 * @returns The access token received from Apigee
 * @throws If the request fails or the response is invalid
 */
export const exchangeTokenForApigeeAccessToken = async (
  axiosInstance: AxiosInstance,
  apigeeTokenEndpoint: string,
  requestBody: ParsedUrlQuery,
  logger: Logger
): Promise<{accessToken: string; refreshToken: string; expiresIn: number}> => {
  logger.info("Initiating token exchange request", {apigeeTokenEndpoint})

  try {
    const response = await axiosInstance.post(apigeeTokenEndpoint, stringify(requestBody), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      timeout: 2000
      // Cognito will timeout after 5 seconds and leave the token lambda running
      // this will leave behind an orphaned session triggering the concurrent session handling
      // so timeout early to avoid this issue
    })

    if (!response.data?.access_token || !response.data?.expires_in) {
      logger.error("Invalid response from Apigee token endpoint", {response: response.data})
      throw new Error("Invalid response from Apigee token endpoint")
    }

    logger.debug("Successfully exchanged token for Apigee access token", {
      refreshToken: response.data.refresh_token,
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    })

    return {
      refreshToken: response.data.refresh_token,
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      handleAxiosError(error, "Failed to exchange token with Apigee", logger)
    } else {
      logger.error("Unexpected error during Apigee token exchange", {error})
    }
    throw new Error("Error during Apigee token exchange")
  }
}

/**
 * Refreshes an Apigee access token using a refresh token
 */
export const refreshApigeeAccessToken = async (
  axiosInstance: AxiosInstance,
  apigeeTokenEndpoint: string,
  refreshToken: string,
  apigeeApiKey: string,
  apigeeApiSecret: string,
  logger: Logger
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshTokenExpiresIn: number;
}> => {

  logger.info("Refreshing Apigee access token", {
    apigeeTokenEndpoint,
    refreshToken,
    apigeeApiKey
  })

  const requestBody: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: apigeeApiKey,
    client_secret: apigeeApiSecret
  }

  // Make the token refresh request
  const response = await axiosInstance.post(
    apigeeTokenEndpoint,
    stringify(requestBody),
    {
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    })

  // Validate the response
  if (!response.data?.access_token || !response.data?.expires_in) {
    logger.error("Invalid response from Apigee token refresh", {response: response.data})
    throw new Error("Invalid response from Apigee token refresh endpoint")
  }

  logger.info("Successfully refreshed Apigee access token")

  // Build the result object
  const result: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshTokenExpiresIn: number;
  } = {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in,
    refreshToken: response.data.refresh_token,
    refreshTokenExpiresIn: response.data.refresh_token_expires_in
  }

  return result
}
