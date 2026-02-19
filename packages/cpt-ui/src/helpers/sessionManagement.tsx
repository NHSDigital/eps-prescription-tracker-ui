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
      logger.warn("Session expired or invalid. Restarting login.")
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
    logger.error("Error calling session management or updating user info", response)
    return false

  } catch (err) {
    logger.error("Error calling session management or updating user info", err)
    return false
  }
}

export const extendUserSession = async (): Promise<boolean> => {
  try {
    // updates lastActivityTime in dynamoDB
    //middleware authentication handles the actual dynamodb interaction, and updates the lastActivityTime
    const response = await http.get(API_ENDPOINTS.TRACKER_USER_INFO)
    logger.info("Extended user session")

    if (response.status === 200) {
      logger.info("Session successfully extended.")
      return true
    }

    if (response.status === 401) {
      logger.warn("Session expired or invalid during extension attempt.")
      return false
    }

    logger.error("Unexpected response when extending session", {status: response.status})
    return false

  } catch (err) {
    logger.error("Error extending user session", err)
    return false
  }
}
