import {useCallback, useRef} from "react"
import {logger} from "@/helpers/logger"
import {useAuth} from "@/context/AuthProvider"
import {updateRemoteSelectedRole} from "@/helpers/userInfo"
import {handleSignoutEvent} from "@/helpers/logout"
import {useNavigate} from "react-router-dom"
export interface SessionTimeoutProps {
  onStayLoggedIn: () => Promise<void>
  onLogOut: () => Promise<void>
  onTimeout: () => Promise<void>
}

export const useSessionTimeout = () => {
  const auth = useAuth()
  const navigate = useNavigate()
  const actionLockRef = useRef<"extending" | "loggingOut" | undefined>(undefined)

  const handleStayLoggedIn = useCallback(async () => {
    // Prevent multiple simultaneous extension attempts or cross-calls
    if (actionLockRef.current !== undefined) {
      logger.info("Session action already in progress, ignoring duplicate request")
      return
    }

    try {
      actionLockRef.current = "extending"
      logger.info("User chose to extend session")

      auth.setLogoutModalType(undefined)
      auth.setSessionTimeoutModalInfo(prev => ({
        ...prev,
        showModal: false,
        sessionEndTime: null,
        action: "extending",
        buttonDisabled: true
      }))

      // Call the selectedRole API with current role to refresh session
      if (auth.selectedRole) {
        await updateRemoteSelectedRole(auth.selectedRole)
        logger.info("Session extended successfully")

        // Reset state after successful extension
        auth.setSessionTimeoutModalInfo(
          prev => ({...prev, buttonDisabled: false, action: undefined}))
        actionLockRef.current = undefined
        await auth.updateTrackerUserInfo()
      } else {
        logger.error("No selected role available to extend session")
        auth.setSessionTimeoutModalInfo(prev => ({...prev, action: "loggingOut", buttonDisabled: true}))
        // Clear the extending lock so handleLogOut can proceed with logout
        actionLockRef.current = undefined
        await handleLogOut()
      }
    } catch (error) {
      logger.error("Error extending session:", error)
      // Hide modal and clear timer, then proceed to logout
      auth.setLogoutModalType(undefined)
      auth.setSessionTimeoutModalInfo(prev => ({
        ...prev,
        showModal: false,
        sessionEndTime: null,
        action: "loggingOut",
        buttonDisabled: true
      }))
      // Clear the extending lock so handleLogOut can proceed with logout
      actionLockRef.current = undefined
      await handleLogOut()
    }
  }, [auth])

  const handleLogOut = useCallback(async () => {
    // Prevent multiple simultaneous logout attempts or cross-calls
    if (actionLockRef.current !== undefined) {
      logger.info("Session action already in progress, ignoring duplicate request")
      return
    }
    actionLockRef.current = "loggingOut"
    logger.info("User chose to log out from session timeout modal")
    auth.setSessionTimeoutModalInfo(prev => ({...prev, action: "loggingOut", buttonDisabled: true}))
    await handleSignoutEvent(auth, navigate, "Timeout", "Timeout")
    auth.setLogoutModalType(undefined)
  }, [auth])

  const handleTimeout = useCallback(async () => {
    logger.warn("Session automatically timed out")
    await handleSignoutEvent(auth, navigate, "Timeout", "Timeout")
  }, [auth])

  return {
    onStayLoggedIn: handleStayLoggedIn,
    onLogOut: handleLogOut,
    onTimeOut: handleTimeout,
    resetSessionTimeout: () => {}
  }
}
