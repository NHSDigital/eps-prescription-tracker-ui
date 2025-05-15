import {Logger} from "@aws-lambda-powertools/logger"
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb"
import {RoleDetails} from "./userUtils"

interface UserDetails {
  family_name: string,
  given_name: string
}

export interface TokenMappingItem {
    username: string,
    cis2AccessToken?: string,
    cis2RefreshToken?: string,
    cis2ExpiresIn?: string,
    cis2IdToken?: string,
    apigeeAccessToken?: string,
    apigeeRefreshToken?: string,
    apigeeExpiresIn?: number,
    selectedRoleId?: string,
    userDetails?: UserDetails,
    rolesWithAccess?: Array<RoleDetails>,
    rolesWithoutAccess?: Array<RoleDetails>
    currentlySelectedRole?: RoleDetails
  }

export const insertTokenMapping = async (
  documentClient: DynamoDBDocumentClient,
  tokenMappingTableName: string,
  item: TokenMappingItem,
  logger: Logger
): Promise<void> => {
  logger.debug("Going to insert into tokenMapping")
  try {
    await documentClient.send(
      new PutCommand({
        TableName: tokenMappingTableName,
        Item: item
      })
    )
    logger.info("Data inserted into stateMapping")
  } catch(error) {
    logger.error("Error inserting into tokenMapping", {error})
    throw new Error("Error inserting into tokenMapping table")
  }
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
    const expiryTimestamp = currentTime + Number(tokenMappingItem.apigeeExpiresIn)

    const expressionParts: Array<string> = []
    const expressionAttributeValues: Record<string, unknown> = {}

    const optionalFields: Array<[keyof typeof tokenMappingItem, unknown]> = [
      ["cis2AccessToken", tokenMappingItem.cis2AccessToken],
      ["cis2RefreshToken", tokenMappingItem.cis2RefreshToken],
      ["cis2ExpiresIn", tokenMappingItem.cis2ExpiresIn],
      ["cis2IdToken", tokenMappingItem.cis2IdToken],
      ["apigeeAccessToken", tokenMappingItem.apigeeAccessToken],
      ["apigeeRefreshToken", tokenMappingItem.apigeeRefreshToken],
      ["apigeeExpiresIn", expiryTimestamp],
      ["selectedRoleId", tokenMappingItem.selectedRoleId],
      ["userDetails", tokenMappingItem.userDetails],
      ["rolesWithAccess", tokenMappingItem.rolesWithAccess],
      ["rolesWithoutAccess", tokenMappingItem.rolesWithoutAccess],
      ["currentlySelectedRole", tokenMappingItem.currentlySelectedRole]
    ]

    for (const [key, value] of optionalFields) {
      if (value !== undefined && value !== null) {
        expressionParts.push(`${key} = :${key}`)
        expressionAttributeValues[`:${key}`] = value
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

export const deleteTokenMapping = async (
  documentClient: DynamoDBDocumentClient,
  tokenMappingTableName: string,
  username: string,
  logger: Logger
): Promise<void> => {
  logger.debug("Going to delete from tokenMapping", {username})
  try {
    const response = await documentClient.send(
      new DeleteCommand({
        TableName: tokenMappingTableName,
        Key: {username}
      })
    )
    if (response.$metadata.httpStatusCode !== 200) {
      logger.error("Failed to delete tokens from dynamoDB", response)
      throw new Error("Failed to delete tokens from dynamoDB")
    }
    logger.debug("Successfully deleted from stateMapping")

  } catch(error) {
    logger.error("Error deleting data from tokenMapping", {error})
    throw new Error("Error deleting data from tokenMapping")
  }
}

export const getTokenMapping = async (
  documentClient: DynamoDBDocumentClient,
  tokenMappingTableName: string,
  username: string,
  logger: Logger
): Promise<TokenMappingItem> => {
  logger.debug("Going to get from tokenMapping", {username})
  try {
    const getResult = await documentClient.send(
      new GetCommand({
        TableName: tokenMappingTableName,
        Key: {username}
      })
    )

    if (!getResult.Item) {
      logger.error("username not found in DynamoDB", {username, getResult})
      throw new Error("State not found in DynamoDB")
    }
    const tokenMappingItem = getResult.Item as TokenMappingItem
    logger.debug("Successfully retrieved data from tokenMapping")
    return tokenMappingItem
  } catch(error) {
    logger.error("Error deleting data from tokenMapping", {error})
    throw new Error("Error deleting data from tokenMapping")
  }
}
