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

  logger.info("Updating data in tokenMapping", {tokenMappingItem, tokenMappingTableName})

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
      ["lastActivityTime", tokenMappingItem.lastActivityTime],
      ["sessionId", tokenMappingItem.sessionId]
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

    logger.info("Successfully updated data in tokenMapping")
  } catch (error) {
    logger.error("Error updating data in tokenMapping", {error})
    throw new Error("Error updating data in tokenMapping")
  }
}

export const deleteTokenMapping = async (
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  username: string,
  logger: Logger
): Promise<void> => {
  logger.debug(`Deleting from ${tableName}`, {username})
  try {
    logger.debug(`Attempting deletion from ${tableName}`, {username})
    const response = await documentClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {username}
      })
    )

    logger.info(`Delete operation completed for ${tableName}`, {response})
    if (response.$metadata.httpStatusCode !== 200) {
      logger.error(`Failed to delete from ${tableName}`, {response})
      throw new Error(`Failed to delete from ${tableName}`)
    }
    logger.debug(`Successfully deleted from ${tableName}`)

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

    if (response.$metadata.httpStatusCode === 200) {
      logger.info(`Delete operation completed for ${tableName}`, {
        tableName,
        username,
        statusCode: response.$metadata.httpStatusCode
      })
    }

    if (response.$metadata.httpStatusCode !== 200) {
      logger.warn(`Delete operation returned non-200 status code for ${tableName}`, {
        tableName,
        username,
        statusCode: response.$metadata.httpStatusCode
      })
    }

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
  const result = await tryGetTokenMapping(documentClient, tableName, username, logger)

  if (result === undefined) {
    logger.error(`Error retrieving data from ${tableName} for user: ${username}`, {tableName, username})
    throw new Error(`Error retrieving data from ${tableName} for user: ${username}`)
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
    logger.error(`Found no record for ${username} in ${tableName}`, {error})
    throw new Error(`Error retrieving data from ${tableName}`)
  }
}
