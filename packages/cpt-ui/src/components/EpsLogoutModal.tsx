import React from "react"
import { Container } from "nhsuk-react-components"

import { EpsModal } from "@/components/EpsModal"
import { EpsLogoutModalStrings } from "@/constants/ui-strings/EpsLogoutModalStrings"
import { Button } from "./ReactRouterButton"

interface EpsLogoutModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onConfirm: () => void
}

export function EpsLogoutModal({ isOpen, onClose, onConfirm }: EpsLogoutModalProps) {

  return (
    <EpsModal isOpen={isOpen} onClose={onClose}>
      <Container>

        <h2
          style={{
            paddingTop: "1rem"
          }}
        >
          {EpsLogoutModalStrings.title}</h2>
        <p>{EpsLogoutModalStrings.caption}</p>

        <div className="eps-modal-button-group">
          <Button
            className="nhsuk-button eps-modal-button"
            onClick={onConfirm}
          >
            {EpsLogoutModalStrings.confirmButtonText}
          </Button>

          <Button
            className="nhsuk-button nhsuk-button--secondary eps-modal-button"
            onClick={onClose}
          >
            {EpsLogoutModalStrings.cancelButtonText}
          </Button>
        </div>
      </Container>
    </EpsModal>
  )
}
