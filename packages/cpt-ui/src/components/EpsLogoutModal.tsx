import React from "react"
import {Container} from "nhsuk-react-components"

import {EpsModal} from "@/components/EpsModal"
import {EpsLogoutModalStrings} from "@/constants/ui-strings/EpsLogoutModalStrings"
import {Button} from "./ReactRouterButton"

interface EpsLogoutModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onConfirm: () => void
}

export function EpsLogoutModal({isOpen, onClose, onConfirm}: EpsLogoutModalProps) {

  return (
    <EpsModal isOpen={isOpen} onClose={onClose} ariaLabelledBy="logout-modal-title">
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
          >
            {EpsLogoutModalStrings.CONFIRM_BUTTON_TEXT}
          </Button>

          <Button
            className="nhsuk-button nhsuk-button--secondary eps-modal-button"
            onClick={onClose}
          >
            {EpsLogoutModalStrings.CANCEL_BUTTON_TEXT}
          </Button>
        </div>
      </Container>
    </EpsModal>
  )
}
