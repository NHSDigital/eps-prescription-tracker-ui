import React, {useEffect} from "react"
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
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  timeLeft,
  onStayLoggedIn,
  onLogOut,
  isExtending
}) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const stayLoggedInButton = document.querySelector('[data-testid="stay-logged-in-button"]') as HTMLElement
        stayLoggedInButton?.focus()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [isOpen])

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
      onClose={onStayLoggedIn}
    >
      <Container data-testid="session-timeout-modal">
        <h2
          id="session-timeout-title"
          style={{
            paddingTop: "1rem"
          }}
        >
          {SESSION_TIMEOUT_MODAL_STRINGS.TITLE}
        </h2>

        <p>
          {SESSION_TIMEOUT_MODAL_STRINGS.MESSAGE}{" "}
          <strong aria-live="polite">{timeLeft}</strong>{" "}
          {SESSION_TIMEOUT_MODAL_STRINGS.COUNTDOWN_SECONDS}.
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
            disabled={isExtending}
          >
            {SESSION_TIMEOUT_MODAL_STRINGS.LOG_OUT}
          </Button>
        </div>
      </Container>
    </EpsModal>
  )
}
