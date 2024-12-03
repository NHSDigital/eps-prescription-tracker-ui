import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {Logger} from "@aws-lambda-powertools/logger"

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

  logger.debug("Updating DynamoDB with new access token", {
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

    logger.info("Access token successfully updated in DynamoDB")
  } catch (error) {
    logger.error("Failed to update access token in DynamoDB", {error})
    throw new Error("Failed to update access token in DynamoDB")
  }
}
