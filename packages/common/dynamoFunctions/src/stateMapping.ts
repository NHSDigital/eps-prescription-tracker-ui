import {Logger} from "@aws-lambda-powertools/logger"
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand
} from "@aws-sdk/lib-dynamodb"

export type StateItem = {
    State: string;
    CognitoState: string;
    ExpiryTime : number;
};

export const insertStateMapping = async (
  documentClient: DynamoDBDocumentClient,
  stateMappingTableName: string,
  item: StateItem,
  logger: Logger
): Promise<void> => {
  logger.debug("Inserting into stateMapping", {item})

  try {
    await documentClient.send(
      new PutCommand({
        TableName: stateMappingTableName,
        Item: item
      })
    )
    logger.info("Data inserted into stateMapping")
  } catch (error) {
    logger.error("Failed to insert into stateMapping table in DynamoDB", {error})
    throw new Error("Failed to insert into stateMapping table in DynamoDB")
  }
}

export const getStateMapping = async (
  documentClient: DynamoDBDocumentClient,
  stateMappingTableName: string,
  state: string,
  logger: Logger
): Promise<StateItem> => {
  logger.debug("Going to get data from stateMapping", {state})
  try {
    const getResult = await documentClient.send(
      new GetCommand({
        TableName: stateMappingTableName,
        Key: {State: state}
      })
    )

    if (!getResult.Item) {
      logger.error("State not found in DynamoDB", {state, getResult})
      throw new Error("State not found in DynamoDB")
    }
    const stateItem = getResult.Item as StateItem
    logger.debug("Successfully retrieved data from stateMapping")
    return stateItem

  } catch (error) {
    logger.error("Error retrieving data from stateMapping", {error})
    throw new Error("Error retrieving data from stateMapping")
  }
}

export const deleteStateMapping = async (
  documentClient: DynamoDBDocumentClient,
  stateMappingTableName: string,
  state: string,
  logger: Logger
): Promise<void> => {
  logger.debug("Going to delete from stateMapping", {state})
  try {
    const response = await documentClient.send(
      new DeleteCommand({
        TableName: stateMappingTableName,
        Key: {State: state}
      })
    )
    if (response.$metadata.httpStatusCode !== 200) {
      logger.error("Failed to delete tokens from dynamoDB", response)
      throw new Error("Failed to delete tokens from dynamoDB")
    }
    logger.debug("Successfully deleted from stateMapping")
  } catch(error) {
    logger.error("Error deleting data from stateMapping", {error})
    throw new Error("Error deleting data from stateMapping")
  }
}
