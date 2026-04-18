import {useCallback, useRef} from "react"
import {logger} from "@/helpers/logger"
import {useAuth} from "@/context/AuthProvider"
import {updateRemoteSelectedRole} from "@/helpers/userInfo"
import {handleSignoutEvent} from "@/helpers/logout"
import {useLocation, useNavigate} from "react-router-dom"
import {normalizePath} from "@/helpers/utils"
import {FRONTEND_PATHS} from "@/constants/environment"

export interface SessionTimeoutProps {
  onStayLoggedIn: () => Promise<void>
  onLogOut: () => Promise<void>
  onTimeout: () => Promise<void>
}

export const useSessionTimeout = () => {
  const auth = useAuth()
  const navigate = useNavigate()
  const actionLockRef = useRef<"extending" | "loggingOut" | undefined>(undefined)
  const location = useLocation()
  const path = normalizePath(location.pathname)

  const clearCountdownTimer = () => {
    auth.setSessionTimeoutModalInfo(prev => ({...prev, timeLeft: 0}))
  }

  const handleStayLoggedIn = useCallback(async () => {
    // Prevent multiple simultaneous extension attempts or cross-calls
    if (actionLockRef.current !== undefined) {
      logger.info("Session action already in progress, ignoring duplicate request")
      return
    }

    if (path === FRONTEND_PATHS.SELECT_YOUR_ROLE || path === FRONTEND_PATHS.SESSION_SELECTION) {
      // Maintain session time but don't show the modal right now
      auth.setLogoutModalType(undefined)
      auth.setSessionTimeoutModalInfo(prev => ({...prev, action: undefined, buttonDisabled: false, showModal: false}))
      return
    }

    try {
      actionLockRef.current = "extending"
      logger.info("User chose to extend session")
      auth.setSessionTimeoutModalInfo(prev => ({...prev, action: "extending", buttonDisabled: true}))

      // Call the selectedRole API with current role to refresh session
      if (auth.selectedRole) {
        await updateRemoteSelectedRole(auth.selectedRole)
        logger.info("Session extended successfully")

        // Hide modal and refresh user info
        auth.setLogoutModalType(undefined)
        auth.setSessionTimeoutModalInfo(
          prev => ({...prev, showModal: false, timeLeft: 0, buttonDisabled: false, action: undefined}))
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
      auth.setSessionTimeoutModalInfo(prev => ({...prev, action: "loggingOut", buttonDisabled: true}))
      // Clear the extending lock so handleLogOut can proceed with logout
      actionLockRef.current = undefined
      await handleLogOut()
    }
  }, [auth, path])

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
    clearCountdownTimer()
    await handleSignoutEvent(auth, navigate, "Timeout", "Timeout")
  }, [auth])

  return {
    onStayLoggedIn: handleStayLoggedIn,
    onLogOut: handleLogOut,
    onTimeOut: handleTimeout,
    resetSessionTimeout: () => {}
  }
}
