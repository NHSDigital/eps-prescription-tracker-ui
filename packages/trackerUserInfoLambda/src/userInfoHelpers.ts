import {Logger} from "@aws-lambda-powertools/logger"
import axios from "axios"
import {DynamoDBDocumentClient, GetCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import {UserInfoResponse, TrackerUserInfo, RoleDetails} from "./userInfoTypes"
import {OidcConfig, verifyIdToken} from "@cpt-ui-common/authFunctions"

// Role names come in formatted like `"category":"subcategory":"roleName"`.
// Takes only the last one, and strips out the quotes.
export const removeRoleCategories = (roleString: string | undefined) => {
  if (!roleString) {
    return undefined
  }
  const chunk = roleString.split(":").pop() as string
  return chunk.replace(/"/g, "")
}

// Fetch user info from the OIDC UserInfo endpoint
// The access token is used to identify the user, and fetch their roles.
// This populates three lists:
//  - rolesWithAccess: roles that have access to the CPT
//  - rolesWithoutAccess: roles that don't have access to the CPT
//  - [OPTIONAL] currentlySelectedRole: the role that is currently selected by the user
// Each list contains information on the roles, such as the role name, role ID, ODS code, and organization name.
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

    // Get roles from the user info response
    const roles = data.nhsid_nrbac_roles || []

    roles.forEach((role) => {
      logger.debug("Processing role", {role})
      const activityCodes = role.activity_codes || []

      const hasAccess = activityCodes.some((code: string) => accepted_access_codes.includes(code))
      logger.debug("Role CPT access?", {hasAccess})

      const roleInfo: RoleDetails = {
        role_name: removeRoleCategories(role.role_name),
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
  logger.info("Getting org name from org code", {org_code})
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
          ":currentlySelectedRole": scrubbedCurrentlySelectedRole
        }
      })
    )
    logger.info("User roles added to DynamoDB", {username})
  } catch (error) {
    logger.error("Error adding user roles to DynamoDB", {username, data, error})
    throw error
  }
}

// Fetch user info from DynamoDB
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

    logger.info("User info successfully retrieved from DynamoDB", {data: response.Item})
    return response.Item as TrackerUserInfo
  } catch (error) {
    logger.error("Error fetching user info from DynamoDB", {error})
    throw new Error("Failed to retrieve user info from cache")
  }
}
