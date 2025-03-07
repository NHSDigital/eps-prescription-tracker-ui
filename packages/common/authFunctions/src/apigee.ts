import {Logger} from "@aws-lambda-powertools/logger"
import jwt from "jsonwebtoken"
import {v4 as uuidv4} from "uuid"
import axios from "axios"
import {ParsedUrlQuery, stringify} from "querystring"
import {handleAxiosError} from "./errorUtils"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"

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
  apigeeTokenEndpoint: string,
  requestBody: ParsedUrlQuery,
  logger: Logger
): Promise<{accessToken: string; expiresIn: number}> => {
  logger.info("Initiating token exchange request", {apigeeTokenEndpoint})

  try {
    const response = await axios.post(apigeeTokenEndpoint, stringify(requestBody), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    })

    if (!response.data?.access_token || !response.data?.expires_in) {
      logger.error("Invalid response from Apigee token endpoint", {response: response.data})
      throw new Error("Invalid response from Apigee token endpoint")
    }

    logger.debug("Successfully exchanged token for Apigee access token", {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    })

    return {
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
 * Updates the Apigee access token in DynamoDB.
 * @param documentClient - DynamoDB DocumentClient instance
 * @param tableName - Name of the DynamoDB table
 * @param username - Username for which to update the token
 * @param accessToken - Access token to update
 * @param expiresIn - Token expiry duration in seconds
 * @param logger - Logger instance for logging
 */
export const updateApigeeAccessToken = async (
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  username: string,
  accessToken: string,
  expiresIn: number,
  logger: Logger
): Promise<void> => {
  const currentTime = Math.floor(Date.now() / 1000)

  logger.debug("Updating DynamoDB with new Apigee access token", {
    username,
    accessToken,
    expiresIn
  })

  try {
    const expiryTimestamp = currentTime + Number(expiresIn)

    await documentClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {username},
        UpdateExpression: "SET Apigee_accessToken = :apigeeAccessToken, Apigee_expiresIn = :apigeeExpiresIn",
        ExpressionAttributeValues: {
          ":apigeeAccessToken": accessToken,
          ":apigeeExpiresIn": expiryTimestamp
        }
      })
    )

    logger.info("Apigee Access token successfully updated in DynamoDB")
  } catch (error) {
    logger.error("Failed to update Apigee access token in DynamoDB", {error})
    throw new Error("Failed to update Apigee access token in DynamoDB")
  }
}
