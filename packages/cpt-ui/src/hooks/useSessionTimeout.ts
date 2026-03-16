import {useCallback, useRef} from "react"
import {logger} from "@/helpers/logger"
import {useAuth} from "@/context/AuthProvider"
import {updateRemoteSelectedRole} from "@/helpers/userInfo"
import {handleRestartLogin, signOut} from "@/helpers/logout"
import {AUTH_CONFIG} from "@/constants/environment"

export interface SessionTimeoutProps {
  onStayLoggedIn: () => Promise<void>
  onLogOut: () => Promise<void>
  onTimeout: () => Promise<void>
}

export const useSessionTimeout = () => {
  const auth = useAuth()
  const actionLockRef = useRef<"extending" | "loggingOut" | undefined>(undefined)

  const clearCountdownTimer = () => {
    auth.setSessionTimeoutModalInfo(prev => ({...prev, timeLeft: 0}))
  }

  const handleStayLoggedIn = useCallback(async () => {
    // Prevent multiple simultaneous extension attempts or cross-calls
    if (actionLockRef.current !== undefined) {
      logger.info("Session action already in progress, ignoring duplicate request")
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
        await handleLogOut()
      }
    } catch (error) {
      logger.error("Error extending session:", error)
      auth.setSessionTimeoutModalInfo(prev => ({...prev, action: "loggingOut", buttonDisabled: true}))
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
    await signOut(auth, AUTH_CONFIG.REDIRECT_SIGN_OUT)
    auth.setLogoutModalType(undefined)
  }, [auth])

  const handleTimeout = useCallback(async () => {
    logger.warn("Session automatically timed out")
    clearCountdownTimer()
    auth.updateInvalidSessionCause("Timeout")
    await handleRestartLogin(auth, "Timeout")
  }, [auth])

  return {
    onStayLoggedIn: handleStayLoggedIn,
    onLogOut: handleLogOut,
    onTimeOut: handleTimeout,
    resetSessionTimeout: () => {}
  }
}
