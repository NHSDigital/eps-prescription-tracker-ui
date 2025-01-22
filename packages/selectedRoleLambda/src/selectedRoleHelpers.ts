import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {RoleDetails} from "./selectedRoleTypes"

// Add the user currentlySelectedRole to the DynamoDB document, keyed by this user's username.
export const updateDynamoTable = async (
  username: string,
  data: RoleDetails,
  documentClient: DynamoDBDocumentClient,
  logger: Logger,
  tokenMappingTableName: string
) => {
  if (!tokenMappingTableName) {
    logger.error("Token mapping table name not set")
    throw new Error("Token mapping table name not set")
  }

  logger.debug("Starting DynamoDB update process", {
    username,
    table: tokenMappingTableName,
    receivedData: data
  })

  // Construct the currentlySelectedRole object from the provided data
  const currentlySelectedRole = {
    role_id: data.role_id ?? "",
    org_code: data.org_code ?? "",
    role_name: data.role_name ?? ""
  }

  const selectedRoleId: string = data.role_id ?? ""

  // Remove undefined values to prevent errors in DynamoDB update
  const scrubbedCurrentlySelectedRole = JSON.parse(
    JSON.stringify(currentlySelectedRole)
  )

  logger.info("Prepared data for DynamoDB update", {
    currentlySelectedRole: scrubbedCurrentlySelectedRole,
    selectedRoleId
  })

  try {
    await documentClient.send(
      new UpdateCommand({
        TableName: tokenMappingTableName,
        Key: {username},
        UpdateExpression:
          "SET currentlySelectedRole.role_id = :role_id, " +
          "currentlySelectedRole.org_code = :org_code, " +
          "currentlySelectedRole.role_name = :role_name, " +
          "selectedRoleId = :selectedRoleId",
        ExpressionAttributeValues: {
          ":role_id": scrubbedCurrentlySelectedRole.role_id,
          ":org_code": scrubbedCurrentlySelectedRole.org_code,
          ":role_name": scrubbedCurrentlySelectedRole.role_name,
          ":selectedRoleId": selectedRoleId
        },
        ReturnValues: "UPDATED_NEW" // Returns only the attributes that were updated in the response
      })
    )

    logger.info("DynamoDB update successful", {
      username,
      updatedRole: scrubbedCurrentlySelectedRole
    })
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
