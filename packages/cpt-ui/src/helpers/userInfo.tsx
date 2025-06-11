import {API_ENDPOINTS} from "@/constants/environment"
import http from "./axios"
import {RoleDetails, TrackerUserInfo, UserDetails} from "@cpt-ui-common/common-types"

export type TrackerUserInfoResult = {
  rolesWithAccess: Array<RoleDetails>,
  rolesWithoutAccess: Array<RoleDetails>,
  hasNoAccess: boolean
  selectedRole: RoleDetails | undefined,
  userDetails: UserDetails | undefined,
  hasSingleRoleAccess: boolean,
  error: string | null
}

export const getTrackerUserInfo = async (): Promise<TrackerUserInfoResult> => {
  let rolesWithAccess: Array<RoleDetails> = []
  let rolesWithoutAccess: Array<RoleDetails> = []
  let hasNoAccess: boolean = true
  let selectedRole: RoleDetails | undefined = undefined
  let userDetails: UserDetails | undefined = undefined
  let hasSingleRoleAccess: boolean = false
  let error: string | null = null

  try {
    console.log("calling tracker user info endpoint")
    const response = await http.get(API_ENDPOINTS.TRACKER_USER_INFO)

    if (response.status !== 200) {
      throw new Error(
        `Server did not return user info, response ${response.status}`
      )
    }

    const data = response.data
    console.log("received this from tracker user info", {response})

    if (!data.userInfo) {
      throw new Error("Server response did not contain data")
    }

    const userInfo: TrackerUserInfo = data.userInfo

    if (userInfo) {
      if (userInfo.roles_with_access) {
        rolesWithAccess = userInfo.roles_with_access
      } else {
        const storedRolesWithAccess = localStorage.getItem("rolesWithAccess")
        if (storedRolesWithAccess) {
          rolesWithAccess = JSON.parse(storedRolesWithAccess)
        } else {
          rolesWithAccess = []
        }
      }
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
    if (userInfo.roles_with_access.length === 1 && userInfo.roles_without_access.length === 0) {
      await updateSelectedRole(userInfo.roles_with_access[0])
      selectedRole = userInfo.roles_with_access[0]
    }

  } catch (err) {
    error =
      err instanceof Error ? err.message : "Failed to fetch user info"

    console.error("Error fetching tracker user info:", err)
  }
  return {
    rolesWithAccess,
    rolesWithoutAccess,
    hasNoAccess,
    selectedRole,
    userDetails,
    hasSingleRoleAccess,
    error
  }
}

export const updateSelectedRole = async (newRole: RoleDetails) => {
  try {
    // Update selected role in the backend via the selectedRoleLambda endpoint using axios
    console.log("calling set selected role")
    const response = await http.put(
      API_ENDPOINTS.SELECTED_ROLE,
      {currently_selected_role: newRole}
    )

    console.log("set the selected role")
    if (response.status !== 200) {
      throw new Error("Failed to update the selected role")
    }

  } catch (error) {
    console.error("Error selecting role:", error)
  }
}
