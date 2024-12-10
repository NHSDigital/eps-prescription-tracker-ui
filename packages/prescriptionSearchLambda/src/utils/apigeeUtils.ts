import axios, {AxiosInstance} from "axios"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {Logger} from "@aws-lambda-powertools/logger"
import {ParsedUrlQuery, stringify} from "querystring"
import {handleAxiosError} from "./errorUtils"

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
): Promise<{accessToken: string; expiresIn: number}> => {
  logger.info("Initiating token exchange request", {apigeeTokenEndpoint})

  try {
    const response = await axiosInstance.post(apigeeTokenEndpoint, stringify(requestBody), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"}
    })

    if (!response.data || !response.data.access_token || !response.data.expires_in) {
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
 * @param accessToken - New Apigee access token
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

  logger.info("Updating DynamoDB with new Apigee access token", {
    username,
    accessToken,
    expiresIn
  })

  try {
    await documentClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {username},
        UpdateExpression: "SET Apigee_accessToken = :apigeeAccessToken, Apigee_expiresIn = :apigeeExpiresIn",
        ExpressionAttributeValues: {
          ":apigeeAccessToken": accessToken,
          ":apigeeExpiresIn": currentTime + expiresIn
        }
      })
    )

    logger.info("Apigee access token successfully updated in DynamoDB")
  } catch (error) {
    logger.error("Failed to update Apigee access token in DynamoDB", {error})
    throw new Error("Failed to update Apigee access token in DynamoDB")
  }
}
