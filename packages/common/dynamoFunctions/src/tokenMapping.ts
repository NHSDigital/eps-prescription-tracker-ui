import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {RoleDetails} from "./userUtils"

interface UserDetails {
  family_name: string,
  given_name: string
}

interface currentlySelectedRole {
  org_code?: string,
  role_id?: string,
  role_name?: string
}
export interface TokenMappingItem {
    username: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    selectedRoleId?: currentlySelectedRole,
    userDetails?: UserDetails,
    rolesWithAccess?: Array<RoleDetails>,
    rolesWithoutAccess?: Array<RoleDetails>
  }

/**
 * Updates the Apigee access token in DynamoDB.
 * @param documentClient - DynamoDB DocumentClient instance
 * @param tokenMappingTableName - Name of the tokenMappingTableName DynamoDB table
 * @param tokenMappingItem - details to update
 * @param logger - Logger instance for logging
 */
export const updateTokenMapping = async (
  documentClient: DynamoDBDocumentClient,
  tokenMappingTableName: string,
  tokenMappingItem: TokenMappingItem,
  logger: Logger
): Promise<void> => {
  const currentTime = Math.floor(Date.now() / 1000)

  logger.debug("Updating DynamoDB with new details", {
    tokenMappingItem
  })

  try {
    const expiryTimestamp = currentTime + Number(tokenMappingItem.expiresIn)

    const expressionParts: Array<string> = []
    const expressionAttributeValues: Record<string, unknown> = {}

    // Required fields
    expressionParts.push("apigee_accessToken = :apigeeAccessToken")
    expressionAttributeValues[":apigeeAccessToken"] = tokenMappingItem.accessToken

    expressionParts.push("apigee_expiresIn = :apigeeExpiresIn")
    expressionAttributeValues[":apigeeExpiresIn"] = expiryTimestamp

    expressionParts.push("apigee_refreshToken = :apigeeRefreshToken")
    expressionAttributeValues[":apigeeRefreshToken"] = tokenMappingItem.refreshToken

    const optionalFields: Array<[keyof typeof tokenMappingItem, string]> = [
      ["selectedRoleId", "selectedRoleId"],
      ["userDetails", "userDetails"],
      ["rolesWithAccess", "rolesWithAccess"],
      ["rolesWithoutAccess", "rolesWithoutAccess"]
    ]

    for (const [key, attr] of optionalFields) {
      const value = tokenMappingItem[key]
      if (value !== undefined && value !== null) {
        expressionParts.push(`${attr} = :${attr}`)
        expressionAttributeValues[`:${attr}`] = value
      }
    }

    const updateExpression = "SET " + expressionParts.join(", ")

    await documentClient.send(
      new UpdateCommand({
        TableName: tokenMappingTableName,
        Key: {username: tokenMappingItem.username},
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues
      })
    )

    logger.info("TokenMapping table successfully updated in DynamoDB")
  } catch (error) {
    logger.error("Failed to update TokenMapping table in DynamoDB", {error})
    throw new Error("Failed to update TokenMapping table in DynamoDB")
  }
}
