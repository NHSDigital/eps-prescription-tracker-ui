import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {RoleDetails, TrackerUserInfo} from "./selectedRoleTypes"

/**
 * Update the user currentlySelectedRole and selectedRoleId in the DynamoDB table.
 * @param username - The username of the user.
 * @param data - The TrackerUserInfo object containing user role information.
 * @param documentClient - The DynamoDBDocumentClient instance.
 * @param logger - The Logger instance for logging.
 * @param tokenMappingTableName - The name of the DynamoDB table.
 */
export const updateDynamoTable = async (
  username: string,
  data: TrackerUserInfo,
  documentClient: DynamoDBDocumentClient,
  logger: Logger,
  tokenMappingTableName: string
) => {
  // Check if the token mapping table name is provided
  if (!tokenMappingTableName) {
    logger.error("Token mapping table name not set")
    throw new Error("Token mapping table name not set")
  }

  logger.debug("Starting DynamoDB update process", {
    username,
    table: tokenMappingTableName,
    receivedData: data
  })

  // DyanamoDB cannot allow undefined values. We need to scrub any undefined values from the data objects
  const currentlySelectedRole: RoleDetails = data.currently_selected_role ? data.currently_selected_role : {}

  // Ensure selectedRoleId is never undefined by providing a fallback value
  const selectedRoleId: string = currentlySelectedRole.role_id || "UNSPECIFIED_ROLE_ID"

  // Since RoleDetails has a bunch of possibly undefined fields, we need to scrub those out.
  // Convert everything to strings, then convert back to a generic object.
  const scrubbedCurrentlySelectedRole = JSON.parse(JSON.stringify(currentlySelectedRole))

  logger.info("Prepared data for DynamoDB update", {
    currentlySelectedRole: scrubbedCurrentlySelectedRole,
    selectedRoleId
  })

  try {
    // Create the update command for DynamoDB
    const updateCommand = new UpdateCommand({
      TableName: tokenMappingTableName,
      Key: {username},
      UpdateExpression: "SET currentlySelectedRole = :currentlySelectedRole, selectedRoleId = :selectedRoleId",
      ExpressionAttributeValues: {
        ":currentlySelectedRole": scrubbedCurrentlySelectedRole,
        ":selectedRoleId": selectedRoleId
      },
      ReturnValues: "ALL_NEW"
    })

    logger.debug("Executing DynamoDB update command", {updateCommand})

    // Send the update command to DynamoDB
    const response = await documentClient.send(updateCommand)

    logger.info("DynamoDB update successful", {response})

  } catch (error) {
    if (error instanceof Error) {
      logger.error("Error updating user's selected role in DynamoDB", {
        username,
        errorMessage: error.message,
        errorStack: error.stack
      })
    } else {
      logger.error("Unknown error type while updating user's selected role", {
        username,
        error
      })
    }
    throw error
  }
}
