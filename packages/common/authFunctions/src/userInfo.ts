import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBDocumentClient, GetCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb"

export type RoleDetails = {
  role_name?: string
  role_id?: string
  org_code?: string
  org_name?: string
  site_name?: string
  site_address?: string
}

export type UserDetails = {family_name: string, given_name: string}

export type TrackerUserInfo = {
  roles_with_access: Array<RoleDetails>
  roles_without_access: Array<RoleDetails>
  currently_selected_role?: RoleDetails
  user_details: UserDetails
}

/**
 * **Updates the user information in DynamoDB.**
 *
 * - Stores `currentlySelectedRole`, `rolesWithAccess`, `rolesWithoutAccess`, and `userDetails`.
 * - Ensures no undefined values are stored in DynamoDB.
 */
export const updateCachedUserInfo = async (
  username: string,
  data: TrackerUserInfo,
  documentClient: DynamoDBDocumentClient,
  logger: Logger,
  tokenMappingTableName: string
) => {
  if (tokenMappingTableName === "") {
    throw new Error("Token mapping table name not set")
  }

  logger.debug("Adding user roles to DynamoDB", {username, data})

  // Dynamo cannot allow undefined values. We need to scrub any undefined values from the data objects
  const currentlySelectedRole: RoleDetails = data.currently_selected_role ? data.currently_selected_role : {}
  const rolesWithAccess: Array<RoleDetails> = data.roles_with_access ? data.roles_with_access : []
  const rolesWithoutAccess: Array<RoleDetails> = data.roles_without_access ? data.roles_without_access : []
  const userDetails: UserDetails = data.user_details || {family_name: "", given_name: ""}

  // Since RoleDetails has a bunch of possibly undefined fields, we need to scrub those out.
  // Convert everything to strings, then convert back to a generic object.
  const scrubbedCurrentlySelectedRole = JSON.parse(JSON.stringify(currentlySelectedRole))
  const scrubbedRolesWithAccess = rolesWithAccess.map((role) => JSON.parse(JSON.stringify(role)))
  const scrubbedRolesWithoutAccess = rolesWithoutAccess.map((role) => JSON.parse(JSON.stringify(role)))
  const scrubbedUserDetails = JSON.parse(JSON.stringify(userDetails))

  try {
    await documentClient.send(
      new UpdateCommand({
        TableName: tokenMappingTableName,
        Key: {username},
        UpdateExpression: `
          SET rolesWithAccess = :rolesWithAccess,
              rolesWithoutAccess = :rolesWithoutAccess,
              currentlySelectedRole = :currentlySelectedRole,
              userDetails = :userDetails
        `,
        ExpressionAttributeValues: {
          ":rolesWithAccess": scrubbedRolesWithAccess,
          ":rolesWithoutAccess": scrubbedRolesWithoutAccess,
          ":currentlySelectedRole": scrubbedCurrentlySelectedRole,
          ":userDetails": scrubbedUserDetails
        }
      })
    )
    logger.info("User roles added to DynamoDB", {username})
  } catch (error) {
    logger.error("Error adding user roles to DynamoDB", {username, data, error})
    throw error
  }
}

/**
 * **Fetches user information from DynamoDB.**
 *
 * - Retrieves `rolesWithAccess`, `rolesWithoutAccess`, `currentlySelectedRole`, and `userDetails`.
 * - Returns default values for missing attributes.
 */
export const fetchCachedUserInfo = async (
  username: string,
  documentClient: DynamoDBDocumentClient,
  logger: Logger,
  tokenMappingTableName: string
): Promise<TrackerUserInfo | null> => {
  logger.info("Fetching user info from DynamoDB", {username})

  try {
    const response = await documentClient.send(
      new GetCommand({
        TableName: tokenMappingTableName,
        Key: {username}
      })
    )

    if (!response.Item) {
      logger.warn("No user info found in DynamoDB", {username})
      return null
    }

    // Ensure correct keys are returned
    const mappedUserInfo: TrackerUserInfo = {
      roles_with_access: response.Item.rolesWithAccess || [],
      roles_without_access: response.Item.rolesWithoutAccess || [],
      currently_selected_role: response.Item.currentlySelectedRole || undefined,
      user_details: response.Item.userDetails || {family_name: "", given_name: ""}
    }

    logger.info("User info successfully retrieved from DynamoDB", {data: mappedUserInfo})
    return mappedUserInfo
  } catch (error) {
    logger.error("Error fetching user info from DynamoDB", {error})
    throw new Error("Failed to retrieve user info from cache")
  }
}
