import {
  useEffect,
  useState,
  useCallback,
  useRef
} from "react"
import {logger} from "@/helpers/logger"

export interface SessionTimeoutProps {
  showModal: boolean
  timeLeft: number
  onStayLoggedIn: () => Promise<void>
  onLogOut: () => Promise<void>
  onTimeout: () => Promise<void>
}

export const useSessionTimeout = (props: SessionTimeoutProps) => {
  const [sessionState, setSessionState] = useState<{
    timeLeft: number
    isExtending: boolean
  }>({
    timeLeft: 0,
    isExtending: false
  })

  const countdownTimerRef = useRef<number | null>(null)

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }, [])

  const handleTimeoutLogout = useCallback(async () => {
    logger.warn("Session expired - automatically logging out user")
    clearCountdownTimer()
    await props.onTimeout()
  }, [props.onTimeout, clearCountdownTimer])

  // Effect to start/stop countdown based on modal visibility
  useEffect(() => {
    if (props.showModal && props.timeLeft > 0) {
      // Only start if not already running or if starting fresh
      if (!countdownTimerRef.current) {
        let secondsLeft = Math.floor(props.timeLeft / 1000)

        // Set initial time
        setSessionState(prev => ({
          ...prev,
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
            clearInterval(countdownTimerRef.current!)
            countdownTimerRef.current = null
            handleTimeoutLogout()
          }
        }, 1000) as unknown as number
      }
    } else {
      // Clear timer when modal is hidden
      clearCountdownTimer()
    }

    // Cleanup on unmount
    return clearCountdownTimer
  }, [props.showModal]) // Only depend on showModal, not timeLeft

  const handleExtendSession = useCallback(async () => {
    setSessionState(prev => ({...prev, isExtending: true}))
    try {
      await props.onStayLoggedIn()
      setSessionState(prev => ({...prev, isExtending: false}))
    } catch {
      setSessionState(prev => ({...prev, isExtending: false}))
      await props.onLogOut()
    }
  }, [props])

  return {
    showModal: props.showModal,
    timeLeft: sessionState.timeLeft,
    onStayLoggedIn: handleExtendSession,
    onLogOut: props.onLogOut,
    isExtending: sessionState.isExtending,
    resetSessionTimeout: () => {}
  }
}
