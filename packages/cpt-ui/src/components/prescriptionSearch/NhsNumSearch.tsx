import React from "react"
import {Button} from "../ReactRouterButton"

import {FRONTEND_PATHS} from "@/constants/environment"

export default function NhsNumSearch() {
  return (
    <>
      <h1 data-testid="nhs-number-search-heading">NHS Number Search</h1>
      <div className="eps-modal-button-group" data-testid="nhs-number-search-button-group">
        <Button
          className="nhsuk-button eps-modal-button"
          to={`${FRONTEND_PATHS.PRESCRIPTION_RESULTS}?nhsNumber=123456`}
          data-testid="find-patient-button"
        >
                    Find a patient
        </Button>
      </div>
    </>
  )
}
