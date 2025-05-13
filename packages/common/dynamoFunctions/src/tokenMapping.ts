import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"

export interface TokenMappingItem {
    username: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    selectedRoleId?: string
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
  tokenMappingTableName: string,
  tokenMappingItem: TokenMappingItem,
  logger: Logger
): Promise<void> => {
  const currentTime = Math.floor(Date.now() / 1000)

  logger.debug("Updating DynamoDB with new Apigee access token", {
    tokenMappingItem
  })

  try {
    const expiryTimestamp = currentTime + Number(tokenMappingItem.expiresIn)

    let updateExpression = `
        SET apigee_accessToken = :apigeeAccessToken, 
        apigee_expiresIn = :apigeeExpiresIn, 
        apigee_refreshToken = :apigeeRefreshToken`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let expressionAttributeValues: any = {
      ":apigeeAccessToken": tokenMappingItem.accessToken,
      ":apigeeExpiresIn": expiryTimestamp,
      ":apigeeRefreshToken": tokenMappingItem.refreshToken
    }

    if (tokenMappingItem.selectedRoleId) {
      updateExpression = updateExpression + ", selectedRoleId = :selectedRoleId"
      expressionAttributeValues = {
        ...expressionAttributeValues,
        ":selectedRoleId": tokenMappingItem.selectedRoleId
      }
    }

    await documentClient.send(
      new UpdateCommand({
        TableName: tokenMappingTableName,
        Key: {username: tokenMappingItem.username},
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues
      })
    )

    logger.info("Apigee Access token successfully updated in DynamoDB")
  } catch (error) {
    logger.error("Failed to update Apigee access token in DynamoDB", {error})
    throw new Error("Failed to update Apigee access token in DynamoDB")
  }
}
