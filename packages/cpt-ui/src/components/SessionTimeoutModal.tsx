import React, {
  useEffect,
  useRef,
  useCallback,
  useState
} from "react"
import {Container} from "nhsuk-react-components"

import {EpsModal} from "@/components/EpsModal"
import {SESSION_TIMEOUT_MODAL_STRINGS} from "@/constants/ui-strings/SessionTimeoutModalStrings"
import {Button} from "./ReactRouterButton"
import {useAuth} from "@/context/AuthProvider"
import {logger} from "@/helpers/logger"

interface SessionTimeoutModalProps {
  isOpen: boolean
  sessionEndTime: number | null
  onStayLoggedIn: () => Promise<void>
  onLogOut: () => Promise<void>
  onTimeOut: () => Promise<void>
  buttonDisabledState: boolean
  isSelectYourRolePath: boolean
}

// Helper functions moved outside component to reduce cognitive complexity
const formatPlural = (count: number, word: string): string => {
  if (count === 1) {
    return word
  }
  return `${word}s`
}

const formatTimeAnnouncement = (minutes: number, seconds: number): string => {
  if (minutes > 0) {
    const minuteText = `${minutes} ${formatPlural(minutes, "minute")}`
    if (seconds > 0) {
      const secondText = `${seconds} ${formatPlural(seconds, "second")}`
      return `${minuteText} and ${secondText}`
    }
    return minuteText
  }
  return `${seconds} ${formatPlural(seconds, "second")}`
}

const shouldAnnounceAtTime = (timeLeft: number): boolean => {
  if (timeLeft <= 20) {
    const criticalTimes = [20, 15, 10, 5]
    return criticalTimes.includes(timeLeft)
  }
  return timeLeft % 15 === 0
}

const updateLiveRegion = (liveRegionRef: React.RefObject<HTMLSpanElement>, announcement: string): void => {
  if (liveRegionRef.current) {
    liveRegionRef.current.textContent = `You will be logged out in ${announcement}.`
  }
}

// Custom hooks to further reduce cognitive complexity
const useModalFocus = (isOpen: boolean) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const stayLoggedInButton = document.querySelector('[data-testid="stay-logged-in-button"]') as HTMLElement
        stayLoggedInButton?.focus()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [isOpen])
}

const useAriaLiveAnnouncements = (
  isOpen: boolean,
  timeLeft: number,
  liveRegionRef: React.RefObject<HTMLSpanElement>,
  isSelectYourRolePath: boolean
) => {
  // Initialize aria-live region when modal first opens
  useEffect(() => {
    const shouldInitialize = isOpen && timeLeft > 0 && liveRegionRef.current
    if (shouldInitialize) {
      const minutes = Math.floor(timeLeft / 60)
      const seconds = timeLeft % 60
      if (isSelectYourRolePath) {
        const selectRoleAnnouncement =
          formatTimeAnnouncement(minutes, seconds) + ". " + SESSION_TIMEOUT_MODAL_STRINGS.SELECT_YOUR_ROLE_INSTRUCTION
        updateLiveRegion(liveRegionRef, selectRoleAnnouncement)
      } else {
        const announcement = formatTimeAnnouncement(minutes, seconds)
        updateLiveRegion(liveRegionRef, announcement)
      }
    }
  }, [isOpen, timeLeft]) // Depend on both isOpen and timeLeft

  // Handle periodic announcements for screen readers
  useEffect(() => {
    const shouldSkip = !isOpen || timeLeft <= 0
    if (shouldSkip) {
      return
    }

    if (shouldAnnounceAtTime(timeLeft)) {
      const minutes = Math.floor(timeLeft / 60)
      const seconds = timeLeft % 60
      const announcement = formatTimeAnnouncement(minutes, seconds)
      updateLiveRegion(liveRegionRef, announcement)
    }
  }, [timeLeft, isOpen])
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  sessionEndTime,
  onStayLoggedIn,
  onLogOut,
  onTimeOut,
  buttonDisabledState,
  isSelectYourRolePath
}) => {
  const liveRegionRef = useRef<HTMLSpanElement>(null)
  const auth = useAuth()
  const [, forceUpdate] = useState({})
  const countdownTimerRef = useRef<number | null>(null)

  // Calculate remaining time from sessionEndTime
  const calculateRemainingTime = useCallback((endTime: number): number => {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
    return remaining
  }, [])

  // Get current timeLeft for display and announcements
  const timeLeft = sessionEndTime ? calculateRemainingTime(sessionEndTime) : 0

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }, [])

  useModalFocus(isOpen)
  useAriaLiveAnnouncements(isOpen, timeLeft, liveRegionRef, isSelectYourRolePath)

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      onStayLoggedIn()
      return
    }
  }

  // Effect to start/stop countdown based on modal visibility
  useEffect(() => {
    if (isOpen && sessionEndTime) {
      // Only start if not already running
      if (!countdownTimerRef.current) {
        // Start countdown that recalculates every second
        countdownTimerRef.current = setInterval(() => {
          // Force component re-render to update displayed time
          forceUpdate({})

          // Calculate current remaining time
          const currentTimeLeft = calculateRemainingTime(sessionEndTime)

          // Auto-logout when countdown reaches 0
          if (currentTimeLeft <= 0) {
            // Don't timeout if a session extension is in progress
            if (auth.sessionTimeoutModalInfo.action === "extending") {
              logger.info("Session countdown reached 0 but extension in progress, not timing out")
              return
            }
            clearCountdownTimer()
            onTimeOut()
          }
        }, 1000) as unknown as number
      }
    } else {
      // Clear timer when modal is hidden
      clearCountdownTimer()
    }

    // Cleanup on unmount
    return clearCountdownTimer
  }, [isOpen, sessionEndTime, calculateRemainingTime, auth, onTimeOut, clearCountdownTimer])

  return (
    <EpsModal
      isOpen={isOpen}
      ariaLabelledBy="session-timeout-title"
      ariaDescribedBy="session-timeout-title"
      onClose={onStayLoggedIn}
    >
      <Container data-testid="session-timeout-modal">
        <span ref={liveRegionRef} aria-live="assertive"
          style={{position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden"}}></span>
        <h2
          id="session-timeout-title"
          style={{
            paddingTop: "1rem"
          }}
        >
          {SESSION_TIMEOUT_MODAL_STRINGS.TITLE}
        </h2>

        <p id="timeout-description">
          <span aria-hidden="true">
            {SESSION_TIMEOUT_MODAL_STRINGS.MESSAGE} <strong>
              {timeLeft}</strong> {SESSION_TIMEOUT_MODAL_STRINGS.COUNTDOWN_SECONDS}.

            {isSelectYourRolePath && (
              <span aria-hidden="true">
                <br /><br />
                {SESSION_TIMEOUT_MODAL_STRINGS.SELECT_YOUR_ROLE_INSTRUCTION}
              </span>
            )}
          </span>
        </p>

        <div className="eps-modal-button-group" onKeyDown={handleKeyDown}>
          <Button
            className="nhsuk-button eps-modal-button"
            data-testid="stay-logged-in-button"
            onClick={onStayLoggedIn}
            disabled={buttonDisabledState}
          >
            {isSelectYourRolePath ?
              SESSION_TIMEOUT_MODAL_STRINGS.CLOSE_MESSAGE : SESSION_TIMEOUT_MODAL_STRINGS.STAY_LOGGED_IN}
          </Button>

          <Button
            className="nhsuk-button nhsuk-button--secondary eps-modal-button"
            data-testid="logout-button"
            onClick={onLogOut}
            disabled={buttonDisabledState}
          >
            {auth.sessionTimeoutModalInfo.action === "loggingOut" ?
              "Logging out..." : SESSION_TIMEOUT_MODAL_STRINGS.LOG_OUT}
          </Button>
        </div>
      </Container>
    </EpsModal>
  )
}
