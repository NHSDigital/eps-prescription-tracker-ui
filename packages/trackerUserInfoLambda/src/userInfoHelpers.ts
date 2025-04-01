import {Logger} from "@aws-lambda-powertools/logger"
import axios from "axios"
import {DynamoDBDocumentClient, GetCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {
  UserInfoResponse,
  TrackerUserInfo,
  RoleDetails,
  UserDetails
} from "./userInfoTypes"
import {OidcConfig, verifyIdToken} from "@cpt-ui-common/authFunctions"

/**
 * **Extracts role name from a structured string.**
 *
 * Role names may be formatted as `"category":"subcategory":"roleName"`.
 * This function extracts only the final part (`roleName`) and removes quotes.
 */
export const removeRoleCategories = (roleString: string | undefined) => {
  if (!roleString) {
    return undefined
  }
  const chunk = roleString.split(":").pop() as string
  return chunk.replace(/"/g, "")
}

/**
 * **Fetches user information from the OIDC UserInfo endpoint.**
 *
 * - Uses the provided access token to retrieve user roles and details.
 * - Organizes roles into three categories:
 *    - `rolesWithAccess`: Roles that have CPT access.
 *    - `rolesWithoutAccess`: Roles that do not have CPT access.
 *    - `currentlySelectedRole`: The user's currently selected role, if applicable.
 * - Extracts basic user details (`family_name` and `given_name`).
 */
export const fetchUserInfo = async (
  cis2AccessToken: string,
  cis2IdToken: string,
  accepted_access_codes: Array<string>,
  logger: Logger,
  oidcConfig: OidcConfig
): Promise<TrackerUserInfo> => {

  logger.info("Fetching user info from OIDC UserInfo endpoint", {oidcConfig})

  // Verify and decode cis2IdToken
  const decodedIdToken = await verifyIdToken(cis2IdToken, logger, oidcConfig)
  logger.debug("Decoded cis2IdToken", {decodedIdToken})

  // Extract the selected_roleid from the decoded cis2IdToken
  const selectedRoleId = decodedIdToken?.selected_roleid
  logger.info("Selected role ID extracted from cis2IdToken", {selectedRoleId})

  if (!oidcConfig.oidcUserInfoEndpoint) {
    throw new Error("OIDC UserInfo endpoint not set")
  }

  try {
    const response = await axios.get<UserInfoResponse>(oidcConfig.oidcUserInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${cis2AccessToken}`
      }
    })
    logger.info("User info fetched successfully")

    // Extract the roles from the user info response
    const data: UserInfoResponse = response.data

    // These will be our outputs
    const rolesWithAccess: Array<RoleDetails> = []
    const rolesWithoutAccess: Array<RoleDetails> = []
    let currentlySelectedRole: RoleDetails | undefined = undefined

    // Extract user details
    const userDetails: UserDetails = {
      family_name: data.family_name,
      given_name: data.given_name
    }

    // Get roles from the user info response
    const roles = data.nhsid_nrbac_roles || []

    /**
     * Processes user roles to determine their access level and selection status.
     *
     * - If a role has access (`hasAccess`), it is added to `rolesWithAccess`.
     * - If a role does not have access, it is added to `rolesWithoutAccess`.
     * - If a role has access and matches the `selectedRoleId`, it is set as `currentlySelectedRole`.
     *
    */
    roles.forEach((role) => {
      logger.debug("Processing role", {role})

      // Extract activity codes and check if any match the accepted access codes
      const activityCodes = role.activity_codes || []
      const hasAccess = activityCodes.some((code: string) => accepted_access_codes.includes(code))

      const roleInfo: RoleDetails = {
        role_name: removeRoleCategories(role.role_name),
        role_id: role.person_roleid,
        org_code: role.org_code,
        org_name: getOrgNameFromOrgCode(data, role.org_code)
      }

      // Ensure the role has at least one of the required fields to be processed
      if (!(roleInfo.role_name || roleInfo.role_id || roleInfo.org_code || roleInfo.org_name)) {
        // Skip roles that don't meet the minimum field requirements
        logger.warn("Role does not meet minimum field requirements", {roleInfo})
        return
      }

      if (hasAccess) {
        if (selectedRoleId && role.person_roleid === selectedRoleId) {
          // If the role has access and matches the selectedRoleId, set it as currently selected
          logger.debug("Role has access and matches selectedRoleId; setting as currently selected", {roleInfo})
          currentlySelectedRole = roleInfo
        } else {
          // Add the role to rolesWithAccess array only if it is NOT the selectedRoleId
          rolesWithAccess.push(roleInfo)
          logger.debug("Role has access; adding to rolesWithAccess", {roleInfo})
        }
      } else {
        // If role lacks access, add it to rolesWithoutAccess array
        rolesWithoutAccess.push(roleInfo)
        logger.debug("Role does not have access; adding to rolesWithoutAccess", {roleInfo})
      }
    })

    const result: TrackerUserInfo = {
      roles_with_access: rolesWithAccess,
      roles_without_access: rolesWithoutAccess,
      currently_selected_role: currentlySelectedRole,
      user_details: userDetails
    }

    logger.info("Returning user info response", {result})
    return result
  } catch (error) {
    logger.error("Error fetching user info", {error})
    throw new Error("Error fetching user info")
  }
}

// Helper function to get organization name from org_code
function getOrgNameFromOrgCode(data: UserInfoResponse, org_code: string): string | undefined {
  const orgs = data.nhsid_user_orgs || []
  const org = orgs.find((o) => o.org_code === org_code)
  return org ? org.org_name : undefined
}

/**
 * **Updates the user information in DynamoDB.**
 *
 * - Stores `currentlySelectedRole`, `rolesWithAccess`, `rolesWithoutAccess`, and `userDetails`.
 * - Ensures no undefined values are stored in DynamoDB.
 */
export const updateDynamoTable = async (
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
export const fetchDynamoTable = async (
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
