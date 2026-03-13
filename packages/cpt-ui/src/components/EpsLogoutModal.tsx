import React from "react"
import {Container} from "nhsuk-react-components"

import {EpsModal} from "@/components/EpsModal"
import {EpsLogoutModalStrings} from "@/constants/ui-strings/EpsLogoutModalStrings"
import {Button} from "./ReactRouterButton"

interface EpsLogoutModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onConfirm: () => void
  readonly isLoggingOut?: boolean
}

export function EpsLogoutModal({isOpen, onClose, onConfirm, isLoggingOut = false}: EpsLogoutModalProps) {
  const handleClose = () => {
    if (!isLoggingOut) {
      onClose()
    }
  }

  return (
    <EpsModal isOpen={isOpen} onClose={handleClose} ariaLabelledBy="logout-modal-title">
      <Container>

        <h2
          id="logout-modal-title"
          style={{
            paddingTop: "1rem"
          }}
        >
          {EpsLogoutModalStrings.TITLE}</h2>
        <p>{EpsLogoutModalStrings.CAPTION}</p>

        <div className="eps-modal-button-group">
          <Button
            className="nhsuk-button eps-modal-button"
            onClick={onConfirm}
            disabled={isLoggingOut}
          >
            {EpsLogoutModalStrings.CONFIRM_BUTTON_TEXT}
          </Button>

          <Button
            className="nhsuk-button nhsuk-button--secondary eps-modal-button"
            onClick={handleClose}
            disabled={isLoggingOut}
          >
            {EpsLogoutModalStrings.CANCEL_BUTTON_TEXT}
          </Button>
        </div>
      </Container>
    </EpsModal>
  )
}
