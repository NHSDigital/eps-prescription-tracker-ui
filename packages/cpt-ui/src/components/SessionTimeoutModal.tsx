import React, {useEffect, useRef} from "react"
import {Container} from "nhsuk-react-components"

import {EpsModal} from "@/components/EpsModal"
import {SESSION_TIMEOUT_MODAL_STRINGS} from "@/constants/ui-strings/SessionTimeoutModalStrings"
import {Button} from "./ReactRouterButton"

interface SessionTimeoutModalProps {
  isOpen: boolean
  timeLeft: number
  onStayLoggedIn: () => Promise<void>
  onLogOut: () => Promise<void>
  isExtending: boolean
  isLoggingOut?: boolean
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  timeLeft,
  onStayLoggedIn,
  onLogOut,
  isExtending,
  isLoggingOut = false
}) => {
  const liveRegionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const stayLoggedInButton = document.querySelector('[data-testid="stay-logged-in-button"]') as HTMLElement
        stayLoggedInButton?.focus()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Initialize aria-live region when modal first opens
  useEffect(() => {
    if (isOpen && timeLeft > 0 && liveRegionRef.current) {
      const minutes = Math.floor(timeLeft / 60)
      const seconds = timeLeft % 60

      let announcement = ""
      if (minutes > 0) {
        announcement = seconds > 0
          ? `${minutes} minute${minutes !== 1 ? "s" : ""} and ${seconds} second${seconds !== 1 ? "s" : ""}`
          : `${minutes} minute${minutes !== 1 ? "s" : ""}`
      } else {
        announcement = `${seconds} second${seconds !== 1 ? "s" : ""}`
      }

      liveRegionRef.current.innerHTML = `You will be logged out in ${announcement}.`
    }
  }, [isOpen]) // Only run when modal opens

  // Handle periodic announcements for screen readers
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) {
      return
    }

    //announce every 15 seconds, then every 5 seconds in the last 20 seconds, and at 10, 5, 3, 2, 1 seconds
    const shouldAnnounce = () => {
      if (timeLeft <= 20) {
        return timeLeft === 20 || timeLeft === 15 ||
        timeLeft === 10 || timeLeft === 5 || timeLeft === 3 || timeLeft === 2 || timeLeft === 1
      } else {
        return timeLeft % 15 === 0
      }
    }

    if (shouldAnnounce()) {
      const minutes = Math.floor(timeLeft / 60)
      const seconds = timeLeft % 60

      let announcement = ""
      if (minutes > 0) {
        announcement = seconds > 0
          ? `${minutes} minute${minutes !== 1 ? "s" : ""} and ${seconds} second${seconds !== 1 ? "s" : ""}`
          : `${minutes} minute${minutes !== 1 ? "s" : ""}`
      } else {
        announcement = `${seconds} second${seconds !== 1 ? "s" : ""}`
      }

      if (liveRegionRef.current) {
        liveRegionRef.current.innerHTML = `You will be logged out in ${announcement}.`
      }
    }
  }, [timeLeft, isOpen])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      onStayLoggedIn()
      return
    }
  }

  return (
    <EpsModal
      isOpen={isOpen}
      ariaLabelledBy="session-timeout-title"
      ariaDescribedBy="session-timeout-title timeout-description"
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
          </span>
        </p>

        <div className="eps-modal-button-group" onKeyDown={handleKeyDown}>
          <Button
            className="nhsuk-button eps-modal-button"
            data-testid="stay-logged-in-button"
            onClick={onStayLoggedIn}
            disabled={isExtending}
          >
            {SESSION_TIMEOUT_MODAL_STRINGS.STAY_LOGGED_IN}
          </Button>

          <Button
            className="nhsuk-button nhsuk-button--secondary eps-modal-button"
            data-testid="logout-button"
            onClick={onLogOut}
            disabled={isExtending || isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : SESSION_TIMEOUT_MODAL_STRINGS.LOG_OUT}
          </Button>
        </div>
      </Container>
    </EpsModal>
  )
}
