import {Logger} from "@aws-lambda-powertools/logger"
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb"
import {RoleDetails, UserDetails} from "@cpt-ui-common/common-types"

export interface TokenMappingItem {
    username: string,
    sessionId?: string,
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
    currentlySelectedRole?: RoleDetails,
    lastActivityTime: number
  }

export const insertTokenMapping = async (
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  item: TokenMappingItem,
  logger: Logger
): Promise<void> => {
  logger.debug("Inserting into table", {item, tableName})
  try {
    await documentClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item
      })
    )
    logger.debug("Successfully inserted into table", {tableName})
  } catch(error) {
    logger.error("Error inserting into table", {error, tableName})
    throw new Error(`Error inserting into table ${tableName}`)
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
      ["currentlySelectedRole", tokenMappingItem.currentlySelectedRole],
      ["lastActivityTime", tokenMappingItem.lastActivityTime]
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

export const deleteRecordAllowFailures = async (
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  username: string,
  logger: Logger
): Promise<void> => {
  logger.debug(`Deleting from ${tableName}`, {username, tableName})
  try {
    const response = await documentClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {username}
      })
    )

    // DynamoDB returns 200 even if the item doesn't exist - this is expected behavior
    // Only log success/info, don't throw errors for non-200 status codes
    logger.info(`Delete operation completed for ${tableName}`, {
      tableName,
      username,
      statusCode: response.$metadata.httpStatusCode
    })
  /* eslint-disable @typescript-eslint/no-explicit-any */
  } catch(error: any) {
    logger.error(`Error deleting data from ${tableName}`, {error})
    throw new Error(`Error deleting data from ${tableName}`)
  }
}

export const getTokenMapping = async (
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  username: string,
  logger: Logger
): Promise<TokenMappingItem> => {
  logger.debug(`Going to get ${tableName}`, {username, tableName})
  const result = await getTokenMapping(documentClient, tableName, username, logger)

  if (result === undefined) {
    logger.debug("No record found for required token mapping", {tableName, username})
    throw new Error(`Failed to retrieve record for specified username: ${username} in ${tableName}`)
  }
  return result as TokenMappingItem
}

export const tryGetTokenMapping = async (
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  username: string,
  logger: Logger
): Promise<TokenMappingItem | undefined> => {
  try {
    logger.info(`Trying to find a record for ${username} in ${tableName}`)
    const result = await documentClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {username: username}
      })
    )

    if (!result.Item) {
      logger.debug("No record found", {tableName, username, result})
      return undefined
    }

    const item = result.Item as TokenMappingItem
    logger.info(`Item found for ${username} in ${tableName}`, {username, tableName, item})
    return item
  } catch(error) {
    logger.info(`Found no record for ${username} in ${tableName}`, {error})
    throw new Error(`Error retrieving data from ${tableName}`)
  }
}
