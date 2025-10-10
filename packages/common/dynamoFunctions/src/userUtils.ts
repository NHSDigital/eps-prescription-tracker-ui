import {Logger} from "@aws-lambda-powertools/logger"
import {RoleDetails, TrackerUserInfo, UserDetails} from "@cpt-ui-common/common-types"

//*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-//

// Types for the incoming data
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

// Helper function to get organization name from org_code
function getOrgNameFromOrgCode(data: UserInfoResponse, org_code: string): string | undefined {
  const orgs = data.nhsid_user_orgs || []
  const org = orgs.find((o) => o.org_code === org_code)
  return org ? org.org_name : undefined
}

interface AllowedAccessCodes {
  [key: string]: {
    baselineRoleCodes: Array<string>,
    childActivityCodes: Array<string>
  }
}

const checkRoleAccess = (roleCode: string, activityCodes: Array<string>, logger: Logger): boolean => {
  // Allowed Role & Activity codes - structure more for documentation/maintainability reasons
  const allowedAccessCodes: AllowedAccessCodes = {
    B0570: { // Perform Pharmacy Activities
      baselineRoleCodes: [
        "R0260", "R0270", "R6200", "R6300", "R0370", "R0380", "R0390", "R0400", "R0410", "R6400",
        "R0600", "R0620", "R0630", "R0690", "R0700", "R0680", "R0018", "R0750", "R0760", "R0770",
        "R0780", "R0790", "R0800", "R0810", "R0820", "R0950", "R0960", "R0970", "R0980", "R0110",
        "R1120", "R1130", "R1140", "R0955", "R0965", "R0975", "R0985", "R1290", "R1540", "R1543",
        "R1547", "R1720", "R1730", "R1740", "R1760", "R1770"
      ],
      childActivityCodes: [
        "B0571", "B0572"
      ]
    },
    B0278: { // Perform Prescription Preparation
      baselineRoleCodes: [
        "R0260", "R0270", "R6200", "R6300", "R1547", "R8001", "R8002", "R0011", "R1380", "R1390",
        "R1400", "R1410", "R1420", "R0019", "R1430", "R1440", "R1540", "R1543", "R1560", "R1600",
        "R1570", "R1450", "R1580", "R1550", "R0002", "R1690", "R1700", "R1710", "R1480", "R1490",
        "R1590", "R1460", "R1470", "R1520", "R1530", "R1980", "R1500", "R1510", "R1610", "R1620",
        "R1630", "R1640", "R1650", "R1660", "R1670", "R1680", "R0007", "R0008", "R0021", "R0022",
        "R0023", "R1720", "R1730", "R1740", "R1750", "R1751", "R1760"
      ],
      childActivityCodes: [
        "B0058", "B0420", "B0440"
      ]
    },
    B0401: { // View Patient Medication
      baselineRoleCodes: [
        "R8004"
      ],
      childActivityCodes: [
        "B0360", "B0069", "B0422", "B0468", "B0429"
      ]
    }
  }

  // Build full deduped lists of codes
  let allAcceptedRoleCodes = []
  let allAcceptedActivityCodes = []
  for (const [parentActivityCode, additionalCodes] of Object.entries(allowedAccessCodes)){
    allAcceptedActivityCodes.push(parentActivityCode, ...additionalCodes.childActivityCodes)
    allAcceptedRoleCodes.push(...additionalCodes.baselineRoleCodes)
  }
  allAcceptedRoleCodes = [...new Set(allAcceptedRoleCodes)]
  allAcceptedActivityCodes = [...new Set(allAcceptedActivityCodes)]
  logger.debug("all accepted roles", {allAcceptedRoleCodes})
  logger.debug("all accepted activities", {allAcceptedActivityCodes})

  // Check for access
  const roleHasAccess = allAcceptedRoleCodes.includes(roleCode)
  logger.debug("Role Access", {roleHasAccess})
  const activitiesHaveAccess = activityCodes.some((code: string) => allAcceptedActivityCodes.includes(code))
  logger.debug("Activities Access", {activitiesHaveAccess})

  return roleHasAccess || activitiesHaveAccess
}

export const extractRoleInformation = (
  data: UserInfoResponse,
  selectedRoleId: string,
  logger: Logger
) => {
  // These will be our outputs
  const rolesWithAccess: Array<RoleDetails> = []
  const rolesWithoutAccess: Array<RoleDetails> = []
  let currentlySelectedRole: RoleDetails | undefined = undefined
  // const accepted_access_codes = getAcceptedActivityCodes()

  // Extract user details
  const userDetails: UserDetails = {
    sub: data.sub,
    name: data.name,
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

    const roleInfo: RoleDetails = {
      role_name: removeRoleCategories(role.role_name),
      role_id: role.person_roleid,
      role_code: role.role_code,
      activity_codes: role.activity_codes || [],
      org_code: role.org_code,
      org_name: getOrgNameFromOrgCode(data, role.org_code)
    }

    // Ensure the role has the minimum required fields to be processed
    if (!(roleInfo.role_name || roleInfo.role_id || roleInfo.org_code || roleInfo.org_name)
      || !roleInfo.role_code || !roleInfo.activity_codes) {
      // Skip roles that don't meet the minimum field requirements
      logger.warn("Role does not meet minimum field requirements", {roleInfo})
      return
    }

    const hasAccess = checkRoleAccess(roleInfo.role_code, roleInfo.activity_codes, logger)
    if (hasAccess) {
      if (selectedRoleId && roleInfo.role_id === selectedRoleId) {
        // If the role has access and matches the selectedRoleId, set it as currently selected
        logger.debug("Role has access and matches selectedRoleId; setting as currently selected", {roleInfo})
        currentlySelectedRole = roleInfo
      }
      // Add the role to rolesWithAccess array only if it is NOT the selectedRoleId
      rolesWithAccess.push(roleInfo)
      logger.debug("Role has access; adding to rolesWithAccess", {roleInfo})

    } else {
      // If role lacks access, add it to rolesWithoutAccess array
      rolesWithoutAccess.push(roleInfo)
      logger.debug("Role does not have access; adding to rolesWithoutAccess", {roleInfo})
    }
  })

  // Default selected role to single available role so UI defaults without second API call
  if (rolesWithAccess.length === 1 && rolesWithoutAccess.length === 0 && !currentlySelectedRole) {
    currentlySelectedRole = rolesWithAccess[0]
  }

  const result: TrackerUserInfo = {
    roles_with_access: rolesWithAccess,
    roles_without_access: rolesWithoutAccess,
    currently_selected_role: currentlySelectedRole,
    user_details: userDetails
  }
  logger.info("Returning user info response", {result})
  return result

}
