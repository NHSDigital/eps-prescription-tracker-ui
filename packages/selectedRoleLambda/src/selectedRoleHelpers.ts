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

  // Construct the currentlySelectedRole object from the provided data, excluding empty values
  const currentlySelectedRole: RoleDetails = Object.fromEntries(
    Object.entries({
      role_id: data.role_id ?? "",
      org_name: data.org_name ?? "",
      org_code: data.org_code ?? "",
      role_name: data.role_name ?? ""
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    }).filter(([_, value]) => value !== "") // Remove keys with empty string values
  )

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
          "SET currentlySelectedRole = :currentlySelectedRole, selectedRoleId = :selectedRoleId",
        ExpressionAttributeValues: {
          ":currentlySelectedRole": scrubbedCurrentlySelectedRole,
          ":selectedRoleId": selectedRoleId
        },
        ReturnValues: "ALL_NEW"
      })
    )

    logger.info("DynamoDB update successful", {
      username,
      selectedRoleId
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
