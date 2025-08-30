import {API_ENDPOINTS} from "@/constants/environment"
import http from "./axios"
import {RoleDetails, TrackerUserInfo, UserDetails} from "@cpt-ui-common/common-types"
import {logger} from "./logger"

export type TrackerUserInfoResult = {
  rolesWithAccess: Array<RoleDetails>,
  rolesWithoutAccess: Array<RoleDetails>,
  hasNoAccess: boolean
  selectedRole: RoleDetails | undefined,
  userDetails: UserDetails | undefined,
  hasSingleRoleAccess: boolean,
  isConcurrentSession: boolean,
  error: string | null
}

export const getTrackerUserInfo = async (): Promise<TrackerUserInfoResult> => {
  let rolesWithAccess: Array<RoleDetails> = []
  let rolesWithoutAccess: Array<RoleDetails> = []
  let hasNoAccess: boolean = true
  let selectedRole: RoleDetails | undefined = undefined
  let userDetails: UserDetails | undefined = undefined
  let hasSingleRoleAccess: boolean = false
  let isConcurrentSession: boolean = false
  let error: string | null = null

  try {
    const response = await http.get(API_ENDPOINTS.TRACKER_USER_INFO)

    if (response.status !== 200) {
      throw new Error(
        `Server did not return user info, response ${response.status}`
      )
    }

    const data = response.data

    if (!data.userInfo) {
      throw new Error("Server response did not contain data")
    }

    const userInfo: TrackerUserInfo = data.userInfo

    if (userInfo) {
      rolesWithAccess = userInfo.roles_with_access
    }

    // The current role may be either undefined, or an empty object. If it's empty, set it undefined.
    let currentlySelectedRole = userInfo.currently_selected_role
    if (
      !currentlySelectedRole ||
        Object.keys(currentlySelectedRole).length === 0
    ) {
      currentlySelectedRole = undefined
    }

    hasNoAccess = userInfo.roles_with_access.length === 0 && !currentlySelectedRole
    rolesWithoutAccess = userInfo.roles_without_access || []
    selectedRole = currentlySelectedRole
    userDetails = userInfo.user_details
    hasSingleRoleAccess = userInfo.roles_with_access.length === 1

    isConcurrentSession = userInfo.is_concurrent_session || false

    if (isConcurrentSession === true) {
      logger.info("This is a concurrent session")
    }
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Failed to fetch user info"

    logger.error("Error fetching tracker user info:", err)
  }
  return {
    rolesWithAccess,
    rolesWithoutAccess,
    hasNoAccess,
    selectedRole,
    userDetails,
    hasSingleRoleAccess,
    isConcurrentSession,
    error
  }
}

export const updateRemoteSelectedRole = async (newRole: RoleDetails) => {
  // Update selected role in the backend via the selectedRoleLambda endpoint using axios
  const response = await http.put(
    API_ENDPOINTS.SELECTED_ROLE,
    {currently_selected_role: newRole}
  )

  if (response.status !== 200) {
    throw new Error("Failed to update the selected role")
  }
}
