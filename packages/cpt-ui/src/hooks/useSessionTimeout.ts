import {
  useEffect,
  useState,
  useCallback,
  useRef
} from "react"
import {useAuth} from "@/context/AuthProvider"
import {extendUserSession} from "@/helpers/sessionManagement"
import {signOut} from "@/helpers/logout"
import {AUTH_CONFIG} from "@/constants/environment"
import {logger} from "@/helpers/logger"
import {sessionTimeoutManager} from "@/helpers/sessionTimeoutManager"

export interface SessionTimeoutState {
  isActive: boolean
  showModal: boolean
  timeLeft: number
  isExtending: boolean
}

export const useSessionTimeout = () => {
  const [sessionState, setSessionState] = useState<SessionTimeoutState>({
    isActive: false,
    showModal: false,
    timeLeft: 60,
    isExtending: false
  })

  const auth = useAuth()
  const warningTimerRef = useRef<number | null>(null)
  const logoutTimerRef = useRef<number | null>(null)
  const countdownTimerRef = useRef<number | null>(null)

  //TODO: change back
  const THIRTEEN_MINUTES = 1 * 30 * 1000
  //TODO: change back
  const FIFTEEN_MINUTES = 2 * 30 * 1000
  //TODO: change back
  const WARNING_DURATION = 1 * 60 * 1000

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }, [])

  const handleTimeoutLogout = useCallback(async () => {
    logger.warn("Session expired - automatically logging out user")
    setSessionState(prev => ({...prev, isActive: false}))
    clearAllTimers()

    // find out invalidsessioncause here, timeout? fixed variable?
    auth.updateInvalidSessionCause("Timeout")
    await signOut(auth, AUTH_CONFIG.REDIRECT_SESSION_SIGN_OUT)
  }, [auth, clearAllTimers])

  const startCountdown = useCallback(() => {
    let secondsLeft = Math.floor(WARNING_DURATION / 1000)

    setSessionState(prev => ({
      ...prev,
      showModal: true,
      timeLeft: secondsLeft
    }))

    countdownTimerRef.current = setInterval(() => {
      secondsLeft -= 1
      setSessionState(prev => ({
        ...prev,
        timeLeft: secondsLeft
      }))

      if (secondsLeft <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current)
          countdownTimerRef.current = null
        }
      }
    }, 1000) as unknown as number
  }, [])

  const resetTimers = useCallback(() => {
    clearAllTimers()
    setSessionState({
      isActive: false,
      showModal: false,
      timeLeft: 60,
      isExtending: false
    })

    warningTimerRef.current = setTimeout(() => {
      logger.info("1 minute of inactivity reached, showing session timeout warning")
      startCountdown()
    }, THIRTEEN_MINUTES) as unknown as number

    // Set automatic logout timer for 2 minutes
    logoutTimerRef.current = setTimeout(() => {
      handleTimeoutLogout()
    }, FIFTEEN_MINUTES) as unknown as number

    logger.debug("Session timeout timers reset", {
      warningTimeMs: THIRTEEN_MINUTES,
      logoutTimeMs: FIFTEEN_MINUTES
    })
  }, [clearAllTimers, startCountdown, handleTimeoutLogout, THIRTEEN_MINUTES, FIFTEEN_MINUTES])

  const handleStayLoggedIn = useCallback(async () => {
    setSessionState(prev => ({
      ...prev,
      isExtending: true
    }))

    try {
      logger.info("User chose to extend session")

      const userExtendsSession = await extendUserSession()

      if (userExtendsSession) {
        logger.info("Session extended successfully")
        clearAllTimers()
        setSessionState({
          isActive: false,
          showModal: false,
          timeLeft: 120,
          isExtending: false
        })
        resetTimers()
      } else {
        logger.error("Failed to extend session")
        await handleLogOut()
      }
    } catch (error) {
      logger.error("Error extending session:", error)
      await handleLogOut()
    }
  }, [clearAllTimers, resetTimers])

  const handleLogOut = useCallback(async () => {
    logger.info("User chose to log out from session timeout modal")
    clearAllTimers()
    setSessionState(prev => ({...prev, isActive: false}))

    await signOut(auth, AUTH_CONFIG.REDIRECT_SIGN_OUT)
  }, [auth, clearAllTimers])

  const handleUserActivity = useCallback(() => {
    resetTimers()
  }, [resetTimers])

  // Set up initial timers when user signs in
  useEffect(() => {
    if (!sessionState.showModal && auth.isSignedIn) {
      resetTimers()
    }
  }, [sessionState.showModal, auth.isSignedIn, resetTimers])

  // Register the reset function with the session timeout manager
  useEffect(() => {
    sessionTimeoutManager.setResetFunction(handleUserActivity)
    return () => {
      sessionTimeoutManager.clearResetFunction()
    }
  }, [handleUserActivity])

  return {
    showModal: sessionState.showModal,
    timeLeft: sessionState.timeLeft,
    onStayLoggedIn: handleStayLoggedIn,
    onLogOut: handleLogOut,
    isExtending: sessionState.isExtending,
    resetSessionTimeout: handleUserActivity
  }
}
