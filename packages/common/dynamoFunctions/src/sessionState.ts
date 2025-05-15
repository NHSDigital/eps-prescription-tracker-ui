import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb"

export type SessionStateItem = {
    LocalCode: string,
    SessionState: string;
    ApigeeCode: string;
    ExpiryTime: number
  };

export const insertSessionState = async (
  documentClient: DynamoDBDocumentClient,
  sessionStateTableName: string,
  item: SessionStateItem,
  logger: Logger
): Promise<void> => {
  logger.debug("Inserting into sessionState", {item})

  try {
    await documentClient.send(
      new PutCommand({
        TableName: sessionStateTableName,
        Item: item
      })
    )
    logger.info("Data inserted into sessionState")
  } catch (error) {
    logger.error("Failed to insert into sessionState table in DynamoDB", {error})
    throw new Error("Failed to insert into sessionState table in DynamoDB")
  }
}

export const getSessionState = async (
  documentClient: DynamoDBDocumentClient,
  sessionStateTableName: string,
  localCode: string,
  logger: Logger
): Promise<SessionStateItem> => {
  logger.debug("Going to get data from sessionState", {localCode})
  try {
    const getResult = await documentClient.send(
      new GetCommand({
        TableName: sessionStateTableName,
        Key: {LocalCode: localCode}
      })
    )

    if (!getResult.Item) {
      logger.error("sessionState not found in DynamoDB", {localCode, getResult})
      throw new Error("sessionState not found in DynamoDB")
    }
    const stateItem = getResult.Item as SessionStateItem
    logger.debug("Successfully retrieved data from sessionState")
    return stateItem

  } catch (error) {
    logger.error("Error retrieving data from sessionState", {error})
    throw new Error("Error retrieving data from sessionState")
  }
}
