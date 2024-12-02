import {Logger} from "@aws-lambda-powertools/logger"
import axios from "axios"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {UserInfoResponse, TrackerUserInfo, RoleDetails} from "./userInfoTypes"

// Fetch user info from the OIDC UserInfo endpoint
// The access token is used to identify the user, and fetch their roles.
// This populates three lists:
//  - rolesWithAccess: roles that have access to the CPT
//  - rolesWithoutAccess: roles that don't have access to the CPT
//  - [OPTIONAL] currentlySelectedRole: the role that is currently selected by the user
// Each list contains information on the roles, such as the role name, role ID, ODS code, and organization name.
export const fetchUserInfo = async (
  cis2AccessToken: string,
  accepted_access_codes: Array<string>,
  selectedRoleId: string | undefined,
  logger: Logger
): Promise<TrackerUserInfo> => {

  const oidcUserInfoEndpoint = process.env["userInfoEndpoint"]
  logger.info("Fetching user info from OIDC UserInfo endpoint", {oidcUserInfoEndpoint})

  if (!oidcUserInfoEndpoint) {
    throw new Error("OIDC UserInfo endpoint not set")
  }

  try {
    const response = await axios.get<UserInfoResponse>(oidcUserInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${cis2AccessToken}`
      }
    })
    logger.info("User info fetched successfully", {data: response.data})

    // Extract the roles from the user info response
    const data: UserInfoResponse = response.data

    // These will be our outputs
    const rolesWithAccess: Array<RoleDetails> = []
    const rolesWithoutAccess: Array<RoleDetails> = []
    let currentlySelectedRole: RoleDetails | undefined = undefined

    // Get roles from the user info response
    const roles = data.nhsid_nrbac_roles || []

    roles.forEach((role) => {
      logger.debug("Processing role", {role})
      const activityCodes = role.activity_codes || []

      const hasAccess = activityCodes.some((code: string) => accepted_access_codes.includes(code))
      logger.debug("Role CPT access?", {hasAccess})

      const roleInfo: RoleDetails = {
        role_name: role.role_name,
        role_id: role.person_roleid,
        org_code: role.org_code,
        org_name: getOrgNameFromOrgCode(data, role.org_code, logger)
      }

      // Ensure the role has at least one of the required fields
      if (!(roleInfo.role_name || roleInfo.role_id || roleInfo.org_code || roleInfo.org_name)) {
        // Skip roles that don't meet the minimum field requirements
        logger.warn("Role does not meet minimum field requirements", {roleInfo})
        return
      }

      if (hasAccess) {
        rolesWithAccess.push(roleInfo)
        logger.debug("Role has access; adding to rolesWithAccess", {roleInfo})
      } else {
        rolesWithoutAccess.push(roleInfo)
        logger.debug("Role does not have access; adding to rolesWithoutAccess", {roleInfo})
      }

      // Determine the currently selected role
      logger.debug("Checking if role is currently selected", {selectedRoleId, role_id: role.person_roleid, roleInfo})
      if (selectedRoleId && role.person_roleid === selectedRoleId) {
        logger.debug("Role is currently selected", {role_id: role.person_roleid, roleInfo})
        if (hasAccess) {
          logger.debug("Role has access; setting as currently selected", {roleInfo})
          currentlySelectedRole = roleInfo
        } else {
          logger.debug("Role does not have access; unsetting currently selected role", {roleInfo})
          currentlySelectedRole = undefined
        }
      }
    })

    const result: TrackerUserInfo = {
      roles_with_access: rolesWithAccess,
      roles_without_access: rolesWithoutAccess,
      currently_selected_role: currentlySelectedRole
    }

    logger.info("Returning user info response", {result})
    return result
  } catch (error) {
    logger.error("Error fetching user info", {error})
    throw new Error("Error fetching user info")
  }
}

// Helper function to get organization name from org_code
function getOrgNameFromOrgCode(data: UserInfoResponse, org_code: string, logger: Logger): string | undefined {
  logger.info("Getting org name from org code", {org_code, data})
  const orgs = data.nhsid_user_orgs || []
  const org = orgs.find((o) => o.org_code === org_code)
  logger.info("Found org", {org})
  return org ? org.org_name : undefined
}

// Add the user currentlySelectedRole, rolesWithAccess and rolesWithoutAccess to the dynamoDB document,
// keyed by this user's username.
export const updateDynamoTable = async (
  username: string,
  data: TrackerUserInfo,
  documentClient: DynamoDBDocumentClient,
  logger: Logger
) => {
  const tokenMappingTableName = process.env["TokenMappingTableName"]
  if (!tokenMappingTableName) {
    throw new Error("Token mapping table name not set")
  }

  logger.debug("Adding user roles to DynamoDB", {username, data})

  // Add the user roles to the DynamoDB table
  const currentlySelectedRole: RoleDetails = data.currently_selected_role ? data.currently_selected_role : {}
  try {
    await documentClient.send(
      new UpdateCommand({
        TableName: tokenMappingTableName,
        Key: {username},
        UpdateExpression:
        // eslint-disable-next-line max-len
          "SET rolesWithAccess = :rolesWithAccess, rolesWithoutAccess = :rolesWithoutAccess, currentlySelectedRole = :currentlySelectedRole",
        ExpressionAttributeValues: {
          ":rolesWithAccess": data.roles_with_access,
          ":rolesWithoutAccess": data.roles_without_access,
          ":currentlySelectedRole": currentlySelectedRole
        }
      })
    )
    logger.info("User roles added to DynamoDB", {username})
  } catch (error) {
    logger.error("Error adding user roles to DynamoDB", {username, data, error})
    throw new Error("Error adding user roles to DynamoDB")
  }
}
