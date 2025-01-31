import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient, GetCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {RoleDetails, SelectedRole} from "./selectedRoleTypes"

/**
 * **Updates the user's selected role in DynamoDB**
 *
 * - Stores the `currentlySelectedRole` and `selectedRoleId` in the table.
 * - Removes the selected role from `rolesWithAccess` to avoid duplication.
 */
export const updateDynamoTable = async (
  username: string,
  updatedUserInfo: SelectedRole,
  documentClient: DynamoDBDocumentClient,
  logger: Logger,
  tokenMappingTableName: string
) => {
  // Validate if the table name is provided in environment variables
  if (!tokenMappingTableName) {
    logger.error("Token mapping table name is not set.")
    throw new Error("Token mapping table name not set")
  }

  logger.debug("Starting DynamoDB update process", {
    username,
    table: tokenMappingTableName,
    receivedData: updatedUserInfo
  })

  // Ensure no undefined values are stored in DynamoDB
  const currentlySelectedRole: RoleDetails = updatedUserInfo.currentlySelectedRole || {}
  const rolesWithAccess: Array<RoleDetails> = updatedUserInfo.rolesWithAccess || []
  const selectedRoleId: string = updatedUserInfo.selectedRoleId || ""

  // Remove `undefined` properties from the objects before updating
  const scrubbedCurrentlySelectedRole = JSON.parse(JSON.stringify(currentlySelectedRole))
  const scrubbedRolesWithAccess = rolesWithAccess.map((role) => JSON.parse(JSON.stringify(role)))

  logger.info("Prepared role data for DynamoDB update", {
    currentlySelectedRole: scrubbedCurrentlySelectedRole,
    rolesWithAccess: scrubbedRolesWithAccess,
    selectedRoleId
  })

  try {
    // Construct the UpdateCommand to modify user role data in DynamoDB
    const updateCommand = new UpdateCommand({
      TableName: tokenMappingTableName,
      Key: {username},
      UpdateExpression: `
        SET currentlySelectedRole = :currentlySelectedRole,
            selectedRoleId = :selectedRoleId,
            rolesWithAccess = :rolesWithAccess
      `,
      ExpressionAttributeValues: {
        ":currentlySelectedRole": scrubbedCurrentlySelectedRole,
        ":rolesWithAccess": scrubbedRolesWithAccess,
        ":selectedRoleId": selectedRoleId
      },
      ReturnValues: "ALL_NEW"
    })

    logger.debug("Executing DynamoDB update command", {updateCommand})

    // Execute the update operation
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

/**
 * **Fetches roles with access from DynamoDB**
 *
 * - Retrieves available roles for a user from the database.
 */
export const fetchDynamoRolesWithAccess = async (
  username: string,
  documentClient: DynamoDBDocumentClient,
  logger: Logger,
  tokenMappingTableName: string
): Promise<SelectedRole> => {
  logger.info("Fetching user role information from DynamoDB", {username})

  try {
    // Execute a GetCommand to fetch user role details
    const response = await documentClient.send(
      new GetCommand({
        TableName: tokenMappingTableName,
        Key: {username}
      })
    )

    // Handle case where no user data is found
    if (!response.Item) {
      logger.warn("No user info found in DynamoDB", {username})
      return {rolesWithAccess: []} // Return empty role list
    }

    const retrievedRolesWithAccess: SelectedRole = {
      rolesWithAccess: response.Item.rolesWithAccess || []
    }

    logger.info("Roles with access successfully retrieved from DynamoDB", {data: retrievedRolesWithAccess})
    return retrievedRolesWithAccess
  } catch (error) {
    logger.error("Error fetching user info from DynamoDB", {error})
    throw new Error("Failed to retrieve user info from cache")
  }
}
