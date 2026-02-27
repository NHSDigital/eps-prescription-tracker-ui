import {API_ENDPOINTS} from "@/constants/environment"
import http from "./axios"
import {
  RoleDetails,
  TrackerUserInfo,
  TrackerUserInfoResult,
  UserDetails
} from "@cpt-ui-common/common-types"
import {logger} from "./logger"
import {AxiosError} from "axios"

type AuthErrorResponse = {
  invalidSessionCause?: string
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  [key: string]: any
}

export const getTrackerUserInfo = async (): Promise<TrackerUserInfoResult> => {
  let rolesWithAccess: Array<RoleDetails> = []
  let rolesWithoutAccess: Array<RoleDetails> = []
  let selectedRole: RoleDetails | undefined = undefined
  let userDetails: UserDetails | undefined = undefined
  let isConcurrentSession: boolean = false
  let invalidSessionCause: string | undefined = undefined
  let error: string | null = null
  let sessionId: string | undefined = undefined
  let remainingSessionTime: number | undefined = undefined

  try {
    const response = await http.get(API_ENDPOINTS.TRACKER_USER_INFO)
    const data = response.data

    if (response.status !== 200) {
      throw new Error(
        `Server did not return user info, response ${response.status}`
      )
    }

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

    rolesWithoutAccess = userInfo.roles_without_access || []
    selectedRole = currentlySelectedRole
    userDetails = userInfo.user_details

    isConcurrentSession = userInfo.is_concurrent_session || false
    sessionId = userInfo.sessionId
    remainingSessionTime = userInfo.remainingSessionTime

    if (isConcurrentSession === true) {
      logger.info("This is a concurrent session")
    }
  } catch (err) {
    if (err instanceof AxiosError) {
      const axiosErr = err as AxiosError<AuthErrorResponse>

      if (axiosErr.response?.status === 401 && axiosErr.response.data?.restartLogin) {
        invalidSessionCause = axiosErr.response.data.invalidSessionCause
      }
      error = axiosErr.message
    } else if (err instanceof Error) {
      error = err.message
    } else {
      error = "Failed to fetch user info"
    }

    if (!invalidSessionCause) {
      logger.error("Error fetching tracker user info:", err)
    } else {
      logger.warn("trackerUserInfo triggered restart login due to:", invalidSessionCause)
    }
  }
  return {
    rolesWithAccess,
    rolesWithoutAccess,
    selectedRole,
    userDetails,
    isConcurrentSession,
    invalidSessionCause,
    sessionId,
    remainingSessionTime,
    error
  }
}

export const updateRemoteSelectedRole = async (newRole: RoleDetails) => {
  // Update selected role in the backend via the selectedRoleLambda endpoint using axios
  //  and return the updated roles with access array
  const response = await http.put(
    API_ENDPOINTS.SELECTED_ROLE,
    {currently_selected_role: newRole}
  )

  if (response.status !== 200) {
    throw new Error("Failed to update the selected role")
  }

  return {
    currentlySelectedRole: response.data.userInfo.currentlySelectedRole
  }
}
