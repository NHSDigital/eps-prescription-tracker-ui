import {Logger} from "@aws-lambda-powertools/logger"
import axios from "axios"
import {
  decodeToken,
  TrackerUserInfo,
  RoleDetails,
  UserDetails
} from "@cpt-ui-common/authFunctions"

type AssuranceLevel = "0" | "1" | "2" | "3"

export interface UserInfoResponse {
  // Always included
  sub: string

  // Claims from the "profile" scope
  name: string
  family_name: string
  given_name: string
  uid: string

  // Claims from the "email" scope
  email: string

  // Claims from the "nhsperson" scope
  nhsid_useruid: string
  title?: string
  idassurancelevel?: AssuranceLevel
  initials?: string
  middle_names?: string
  display_name?: string

  // Claims from the "nationalrbacaccess" scope
  nhsid_nrbac_roles?: Array<NhsIdNRBACRole>

  // Claims from the "associatedorgs" scope
  nhsid_user_orgs?: Array<NhsIdUserOrg>

  // Claims from the "selectedrole" scope
  selected_roleid?: string
}

interface NhsIdNRBACRole {
  // Required fields
  org_code: string
  person_orgid: string
  person_roleid: string
  role_code: string
  role_name: string

  // Optional fields
  activities?: Array<string>
  activity_codes?: Array<string>
  aow?: Array<string>
  aow_codes?: Array<string>
  workgroups?: Array<string>
  workgroups_codes?: Array<string>
}

interface NhsIdUserOrg {
  org_code: string
  org_name: string
}

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
  accessToken: string,
  cis2IdToken: string | null,
  accepted_access_codes: Array<string>,
  logger: Logger,
  userInfoEndpoint: string
): Promise<TrackerUserInfo> => {

  logger.debug("Fetching user info from OIDC UserInfo endpoint", {userInfoEndpoint})

  // Verify and decode cis2IdToken
  const decodedIdToken = cis2IdToken ? decodeToken(cis2IdToken) : null
  logger.debug("Decoded cis2IdToken", {decodedIdToken})

  // Extract the selected_roleid from the decoded cis2IdToken
  const selectedRoleId = decodedIdToken?.selected_roleid
  logger.info("Selected role ID extracted from cis2IdToken", {selectedRoleId})

  const response = await axios.get<UserInfoResponse>(
    userInfoEndpoint,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
  logger.debug("User info fetched successfully")

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
}

// Helper function to get organization name from org_code
function getOrgNameFromOrgCode(data: UserInfoResponse, org_code: string): string | undefined {
  const orgs = data.nhsid_user_orgs || []
  const org = orgs.find((o) => o.org_code === org_code)
  return org ? org.org_name : undefined
}
