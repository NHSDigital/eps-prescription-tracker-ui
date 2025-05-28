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

interface TokenMappingItem {
    username: string,
    cis2AccessToken?: string,
    cis2RefreshToken?: string,
    cis2ExpiresIn?: string,
    cis2IdToken?: string,
    apigeeAccessToken?: string,
    apigeeRefreshToken?: string,
    apigeeExpiresIn?: number,
    apigeeCode?: string,
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
  logger.debug("Inserting into tokenMapping", {item, tokenMappingTableName})
  try {
    await documentClient.send(
      new PutCommand({
        TableName: tokenMappingTableName,
        Item: item
      })
    )
    logger.debug("Successfully inserted into tokenMapping", {tokenMappingTableName})
  } catch(error) {
    logger.error("Error inserting into tokenMapping", {error})
    throw new Error("Error inserting into tokenMapping")
  }
}

export const updateTokenMapping = async (
  documentClient: DynamoDBDocumentClient,
  tokenMappingTableName: string,
  tokenMappingItem: TokenMappingItem,
  logger: Logger
): Promise<void> => {
  const currentTime = Math.floor(Date.now() / 1000)

  logger.debug("Updating data in tokenMapping", {tokenMappingItem, tokenMappingTableName})

  try {
    let expiryTimestamp
    if (tokenMappingItem.apigeeExpiresIn) {
      expiryTimestamp = currentTime + Number(tokenMappingItem.apigeeExpiresIn)
    }

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
      ["apigeeCode", tokenMappingItem.apigeeCode],
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

    logger.debug("Successfully updated data in tokenMapping")
  } catch (error) {
    logger.error("Error updating data in tokenMapping", {error})
    throw new Error("Error updating data in tokenMapping")
  }
}

export const deleteTokenMapping = async (
  documentClient: DynamoDBDocumentClient,
  tokenMappingTableName: string,
  username: string,
  logger: Logger
): Promise<void> => {
  logger.debug("Deleting from tokenMapping", {username, tokenMappingTableName})
  try {
    const response = await documentClient.send(
      new DeleteCommand({
        TableName: tokenMappingTableName,
        Key: {username}
      })
    )
    if (response.$metadata.httpStatusCode !== 200) {
      logger.error("Failed to delete from tokenMapping", {response})
      throw new Error("Failed to delete from tokenMapping")
    }
    logger.debug("Successfully deleted from stateMapping", {tokenMappingTableName})

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
  logger.debug("Going to get from tokenMapping", {username, tokenMappingTableName})
  try {
    const getResult = await documentClient.send(
      new GetCommand({
        TableName: tokenMappingTableName,
        Key: {username}
      })
    )

    if (!getResult.Item) {
      logger.error("username not found in DynamoDB", {username, getResult})
      throw new Error("username not found in DynamoDB")
    }
    const tokenMappingItem = getResult.Item as TokenMappingItem
    logger.debug("Successfully retrieved data from tokenMapping", {tokenMappingTableName, tokenMappingItem})
    return tokenMappingItem
  } catch(error) {
    logger.error("Error retrieving data from tokenMapping", {error})
    throw new Error("Error retrieving data from tokenMapping")
  }
}
