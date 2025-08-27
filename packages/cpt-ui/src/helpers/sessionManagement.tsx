// sessionManagement.ts
import {API_ENDPOINTS} from "@/constants/environment"
import http from "@/helpers/axios"
import {logger} from "./logger"
import type {AuthContextType} from "@/context/AuthProvider"

export const postSessionManagementUpdate = async (auth: AuthContextType, redirect: () => void): Promise<boolean> => {
  try {
    const response = await http.post(API_ENDPOINTS.SESSION_MANAGEMENT, {
      action: "Set-Session"
    })
    logger.info(`Called session management, ${response.data}`)

    if (response.status !== 202) {
      throw new Error(
        `Server error, unable to set active session ${response.status}`
      )
    }

    if (response.data.status === "Active") {
      logger.info("Session is now active.")
      // Refresh tracker user info, so that all state items reflect any actions
      // completed on the concurrent session. Such as isConcurrentSession becoming false
      await auth.updateTrackerUserInfo()
      logger.info("Updated tracker info, redirecting user")
      redirect()
      return true
    }

    return false

  } catch (err) {
    const error = err instanceof Error ? err.message : "Error calling session management or updating user info"
    logger.error("Error calling session management or updating user info", error)
    return false
  }
}
