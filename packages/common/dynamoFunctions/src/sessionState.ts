import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb"

type SessionStateItem = {
  LocalCode: string
  SessionState: string
  ApigeeCode: string
  ExpiryTime: number
}

export const insertSessionState = async (
  documentClient: DynamoDBDocumentClient,
  sessionStateTableName: string,
  item: SessionStateItem,
  logger: Logger
): Promise<void> => {
  logger.debug("Inserting into sessionState", {item, sessionStateTableName})
  try {
    await documentClient.send(
      new PutCommand({
        TableName: sessionStateTableName,
        Item: item
      })
    )
    logger.info("Successfully inserted into sessionState", {sessionStateTableName})
  } catch (error) {
    logger.error("Error inserting into sessionState", {error})
    throw new Error("Error inserting into sessionState")
  }
}

export const getSessionState = async (
  documentClient: DynamoDBDocumentClient,
  sessionStateTableName: string,
  localCode: string,
  logger: Logger
): Promise<SessionStateItem> => {
  logger.debug("Retrieving data from sessionState", {localCode, sessionStateTableName})
  try {
    const getResult = await documentClient.send(
      new GetCommand({
        TableName: sessionStateTableName,
        Key: {LocalCode: localCode}
      })
    )

    if (!getResult.Item) {
      logger.error("localCode not found in sessionState", {localCode, getResult, sessionStateTableName})
      throw new Error("localCode not found in sessionState")
    }
    const sessionStateItem = getResult.Item as SessionStateItem
    logger.debug("Successfully retrieved data from sessionState", {sessionStateItem, sessionStateTableName})
    return sessionStateItem

  } catch (error) {
    logger.error("Error retrieving data from sessionState", {error})
    throw new Error("Error retrieving data from sessionState")
  }
}
