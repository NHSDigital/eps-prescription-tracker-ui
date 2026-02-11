import {
  useEffect,
  useState,
  useCallback,
  useRef
} from "react"
import {useAuth} from "@/context/AuthProvider"
import {updateRemoteSelectedRole} from "@/helpers/userInfo"
import {signOut} from "@/helpers/logout"
import {AUTH_CONFIG} from "@/constants/environment"
import {logger} from "@/helpers/logger"

export interface SessionTimeoutState {
  isActive: boolean
  showModal: boolean
  timeLeft: number
  isExtending: boolean
}

export interface SessionTimeoutProps {
  showModal: boolean
  timeLeft: number
  onStayLoggedIn: () => Promise<void>
  onLogOut: () => Promise<void>
}

export const useSessionTimeout = (props?: SessionTimeoutProps) => {
  const [sessionState, setSessionState] = useState<SessionTimeoutState>({
    isActive: false,
    showModal: false,
    timeLeft: 60,
    isExtending: false
  })

  const auth = useAuth()
  const countdownTimerRef = useRef<number | null>(null)

  // Use props if provided (for AccessProvider integration), otherwise use legacy behavior
  const showModal = props?.showModal ?? sessionState.showModal
  const timeLeft = props?.timeLeft ?? sessionState.timeLeft * 1000

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }, [])

  const handleTimeoutLogout = useCallback(async () => {
    logger.warn("Session expired - automatically logging out user")
    setSessionState(prev => ({...prev, isActive: false}))
    clearCountdownTimer()

    auth.updateInvalidSessionCause("Timeout")
    await signOut(auth, AUTH_CONFIG.REDIRECT_SESSION_SIGN_OUT)
  }, [auth, clearCountdownTimer])

  const handleStayLoggedIn = useCallback(async () => {
    setSessionState(prev => ({
      ...prev,
      isExtending: true
    }))

    try {
      logger.info("User chose to extend session")

      // Call the selectedRole API with current role to refresh session
      if (auth.selectedRole) {
        await updateRemoteSelectedRole(auth.selectedRole)
        logger.info("Session extended successfully via selectedRole API")

        clearCountdownTimer()
        setSessionState({
          isActive: false,
          showModal: false,
          timeLeft: 60,
          isExtending: false
        })

        // Refresh user info to get updated session time
        await auth.updateTrackerUserInfo()
      } else {
        logger.error("No selected role available to extend session")
        await handleLogOut()
      }
    } catch (error) {
      logger.error("Error extending session:", error)
      await handleLogOut()
    }
  }, [auth, clearCountdownTimer])

  const handleLogOut = useCallback(async () => {
    logger.info("User chose to log out from session timeout modal")
    clearCountdownTimer()
    setSessionState(prev => ({...prev, isActive: false}))

    await signOut(auth, AUTH_CONFIG.REDIRECT_SIGN_OUT)
  }, [auth, clearCountdownTimer])

  // Handle countdown when modal should be shown
  useEffect(() => {
    if (showModal && timeLeft > 0) {
      // Start with the server-provided time
      let secondsLeft = Math.floor(timeLeft / 1000)

      setSessionState(prev => ({
        ...prev,
        showModal: true,
        timeLeft: secondsLeft
      }))

      // Start countdown that decrements every second
      countdownTimerRef.current = setInterval(() => {
        secondsLeft -= 1
        setSessionState(prev => ({
          ...prev,
          timeLeft: secondsLeft
        }))

        // Auto-logout when countdown reaches 0
        if (secondsLeft <= 0) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
          }
          handleTimeoutLogout()
        }
      }, 1000) as unknown as number

    } else if (!showModal) {
      clearCountdownTimer()
      setSessionState(prev => ({...prev, showModal: false}))
    }

    // Cleanup timer when effect runs again or component unmounts
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
    }
  }, [showModal, timeLeft, clearCountdownTimer, handleTimeoutLogout])

  // Use props handlers if provided, otherwise use internal handlers
  const stayLoggedInHandler = props?.onStayLoggedIn ?? handleStayLoggedIn
  const logOutHandler = props?.onLogOut ?? handleLogOut

  return {
    showModal,
    timeLeft: sessionState.timeLeft,
    onStayLoggedIn: stayLoggedInHandler,
    onLogOut: logOutHandler,
    isExtending: sessionState.isExtending,
    resetSessionTimeout: () => {} // No longer needed with server-side approach
  }
}
