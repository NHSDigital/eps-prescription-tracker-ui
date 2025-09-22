// sessionManagement.ts
import {API_ENDPOINTS} from "@/constants/environment"
import http from "@/helpers/axios"
import {logger} from "./logger"
import type {AuthContextType} from "@/context/AuthProvider"

export const postSessionManagementUpdate = async (auth: AuthContextType): Promise<boolean> => {
  try {
    const response = await http.post(API_ENDPOINTS.SESSION_MANAGEMENT, {
      action: "Set-Session"
    })
    logger.info(`Called session management, ${response.data}`)

    if (response.status === 401) {
      logger.error("Session expired or invalid. Restarting login.")
      return false
    }

    if (response.status === 202 && response.data.status === "Active") {
      logger.info("Session is now active.")
      // Refresh tracker user info, so that all state items reflect any actions
      // completed on the concurrent session. Such as isConcurrentSession becoming false
      await auth.updateTrackerUserInfo()
      logger.info("Updated tracker info")
      return true
    }
    logger.error("Error calling session management or updating user info")
    return false

  } catch (err) {
    const error = err instanceof Error ? err.message : "Error calling session management or updating user info"
    logger.error("Error calling session management or updating user info", error)
    return false
  }
}
