import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {SelectedRole, RoleDetails} from "./selectedRoleTypes"

// Add the user currentlySelectedRole, rolesWithAccess and rolesWithoutAccess to the dynamoDB document,
// keyed by this user's username.
export const updateDynamoTable = async (
  username: string,
  data: SelectedRole,
  documentClient: DynamoDBDocumentClient,
  logger: Logger,
  tokenMappingTableName: string
) => {
  if (tokenMappingTableName === "") {
    throw new Error("Token mapping table name not set")
  }

  logger.debug("Adding user roles to DynamoDB", {username, data})

  // Add the user roles to the DynamoDB table

  // Dyanamo cannot allow undefined values. We need to scrub any undefined values from the data objects
  const currentlySelectedRole: RoleDetails = data.currently_selected_role ? data.currently_selected_role : {}
  const rolesWithAccess: Array<RoleDetails> = data.roles_with_access ? data.roles_with_access : []
  const rolesWithoutAccess: Array<RoleDetails> = data.roles_without_access ? data.roles_without_access : []
  const selectedRoleId: string = data.currently_selected_role?.role_id ?? ""

  // Since RoleDetails has a bunch of possibly undefined fields, we need to scrub those out.
  // Convert everything to strings, then convert back to a generic object.
  const scrubbedCurrentlySelectedRole = JSON.parse(JSON.stringify(currentlySelectedRole))
  const scrubbedRolesWithAccess = rolesWithAccess.map((role) => JSON.parse(JSON.stringify(role)))
  const scrubbedRolesWithoutAccess = rolesWithoutAccess.map((role) => JSON.parse(JSON.stringify(role)))

  try {
    await documentClient.send(
      new UpdateCommand({
        TableName: tokenMappingTableName,
        Key: {username},
        UpdateExpression:
          // eslint-disable-next-line max-len
          "SET rolesWithAccess = :rolesWithAccess, rolesWithoutAccess = :rolesWithoutAccess, currentlySelectedRole = :currentlySelectedRole",
        ExpressionAttributeValues: {
          ":rolesWithAccess": scrubbedRolesWithAccess,
          ":rolesWithoutAccess": scrubbedRolesWithoutAccess,
          ":currentlySelectedRole": scrubbedCurrentlySelectedRole,
          ":selectedRoleId": selectedRoleId
        }
      })
    )
    logger.info("User roles added to DynamoDB", {username})
  } catch (error) {
    logger.error("Error adding user roles to DynamoDB", {username, data, error})
    throw error
  }
}
