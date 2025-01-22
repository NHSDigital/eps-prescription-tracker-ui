import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {RoleDetails, TrackerUserInfo} from "./selectedRoleTypes"

// Mock data for rolesWithAccess and rolesWithoutAccess
const rolesWithAccess: Array<RoleDetails> = [
  {
    role_name: "General Medical Practitioner",
    role_id: "555043301111",
    org_code: "C82024"
  },
  {
    role_name: "General Medical Practitioner",
    role_id: "555043302222",
    org_code: "P92602"
  }
]

const rolesWithoutAccess: Array<RoleDetails> = [
  {
    role_name: "General Medical Practitioner",
    role_id: "555043303333",
    org_code: "A81060"
  },
  {
    role_name: "Consultant",
    role_id: "555043304444",
    org_code: "A20063"
  },
  {
    role_name: "General Medical Practitioner",
    role_id: "555043305555",
    org_code: "A21292"
  }
]

// Add the user currentlySelectedRole to the DynamoDB document, keyed by this user's username.
export const updateDynamoTable = async (
  username: string,
  data: TrackerUserInfo,
  documentClient: DynamoDBDocumentClient,
  logger: Logger,
  tokenMappingTableName: string
) => {
  if (!tokenMappingTableName) {
    logger.error("Token mapping table name not set")
    throw new Error("Token mapping table name not set")
  }

  if (tokenMappingTableName !== "cpt-ui-pr-334-stateful-resources-TokenMapping") {
    logger.error("Incorrect token mapping table name", {tokenMappingTableName})
    throw new Error("Incorrect token mapping table name")
  }

  if (username !== "Mock_555043304334") {
    logger.error("Incorrect username", {username})
    throw new Error("Incorrect username")
  }

  logger.debug("Starting DynamoDB update process", {
    username,
    table: tokenMappingTableName,
    receivedData: data
  })

  // Dyanamo cannot allow undefined values. We need to scrub any undefined values from the data objects
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
    logger.info("Preparing to send update command to DynamoDB", {
      TableName: tokenMappingTableName,
      Key: {username},
      UpdateExpression:
        "SET rolesWithAccess = :rolesWithAccess, " +
        "rolesWithoutAccess = :rolesWithoutAccess, " +
        "currentlySelectedRole = :currentlySelectedRole, " +
        "selectedRoleId = :selectedRoleId",
      ExpressionAttributeValues: {
        ":rolesWithAccess": rolesWithAccess,
        ":rolesWithoutAccess": rolesWithoutAccess,
        ":currentlySelectedRole": scrubbedCurrentlySelectedRole,
        ":selectedRoleId": selectedRoleId
      }
    })

    await documentClient.send(
      new UpdateCommand({
        TableName: tokenMappingTableName,
        Key: {username},
        UpdateExpression:
          "SET rolesWithAccess = :rolesWithAccess, " +
          "rolesWithoutAccess = :rolesWithoutAccess, " +
          "currentlySelectedRole = :currentlySelectedRole, " +
          "selectedRoleId = :selectedRoleId",
        ExpressionAttributeValues: {
          ":rolesWithAccess": rolesWithAccess,
          ":rolesWithoutAccess": rolesWithoutAccess,
          ":currentlySelectedRole": scrubbedCurrentlySelectedRole,
          ":selectedRoleId": selectedRoleId
        },
        ReturnValues: "UPDATED_NEW"
      })
    )

    logger.info("DynamoDB update successful", {
      username,
      updatedRole: scrubbedCurrentlySelectedRole,
      selectedRoleId: selectedRoleId
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
