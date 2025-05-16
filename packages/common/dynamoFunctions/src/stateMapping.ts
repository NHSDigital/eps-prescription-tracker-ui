import {Logger} from "@aws-lambda-powertools/logger"
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand
} from "@aws-sdk/lib-dynamodb"

type StateItem = {
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
  logger.debug("Inserting into stateMapping", {item, stateMappingTableName})
  try {
    await documentClient.send(
      new PutCommand({
        TableName: stateMappingTableName,
        Item: item
      })
    )
    logger.debug("Successfully inserted into stateMapping", {stateMappingTableName})
  } catch (error) {
    logger.error("Error inserting into stateMapping", {error})
    throw new Error("Error inserting into stateMapping")
  }
}

export const getStateMapping = async (
  documentClient: DynamoDBDocumentClient,
  stateMappingTableName: string,
  state: string,
  logger: Logger
): Promise<StateItem> => {
  logger.debug("Retrieving data from stateMapping", {state, stateMappingTableName})
  try {
    const getResult = await documentClient.send(
      new GetCommand({
        TableName: stateMappingTableName,
        Key: {State: state}
      })
    )

    if (!getResult.Item) {
      logger.error("state not found in stateMapping", {state, getResult, stateMappingTableName})
      throw new Error("state not found in stateMapping")
    }
    const stateItem = getResult.Item as StateItem
    logger.debug("Successfully retrieved data from stateMapping", {stateItem})
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
  logger.debug("Deleting from stateMapping", {state, stateMappingTableName})
  try {
    const response = await documentClient.send(
      new DeleteCommand({
        TableName: stateMappingTableName,
        Key: {State: state}
      })
    )
    if (response.$metadata.httpStatusCode !== 200) {
      logger.error("Failed to delete from stateMapping", {response})
      throw new Error("Failed to delete from stateMapping")
    }
    logger.debug("Successfully deleted from stateMapping", {stateMappingTableName})
  } catch(error) {
    logger.error("Error deleting data from stateMapping", {error})
    throw new Error("Error deleting data from stateMapping")
  }
}
