import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {RoleDetails} from "./selectedRoleTypes"

// Add the user currentlySelectedRole, rolesWithAccess and rolesWithoutAccess to the dynamoDB document,
// keyed by this user's username.
export const updateDynamoTable = async (
  username: string,
  data: RoleDetails,
  documentClient: DynamoDBDocumentClient,
  logger: Logger,
  tokenMappingTableName: string
) => {
  if (tokenMappingTableName === "") {
    throw new Error("Token mapping table name not set")
  }

  logger.debug("Adding user roles to DynamoDB", {username, data})

  // Construct the currentlySelectedRole object from the provided data
  const currentlySelectedRole: RoleDetails = {
    role_id: data.role_id ?? "",
    org_name: data.org_name ?? "",
    org_code: data.org_code ?? "",
    role_name: data.role_name ?? ""
  }

  const selectedRoleId: string = data.role_id ?? ""

  // Remove any undefined properties from the object before updating
  const scrubbedCurrentlySelectedRole = JSON.parse(JSON.stringify(currentlySelectedRole))

  try {
    await documentClient.send(
      new UpdateCommand({
        TableName: tokenMappingTableName,
        Key: {username},
        UpdateExpression: "SET currentlySelectedRole = :currentlySelectedRole, selectedRoleId = :selectedRoleId",
        ExpressionAttributeValues: {
          ":currentlySelectedRole": scrubbedCurrentlySelectedRole,
          ":selectedRoleId": selectedRoleId
        }
      })
    )
    logger.info("User's selected role updated in DynamoDB", {username})
  } catch (error) {
    logger.error("Error updating user's selected role in DynamoDB", {username, error})
    throw error
  }
}
