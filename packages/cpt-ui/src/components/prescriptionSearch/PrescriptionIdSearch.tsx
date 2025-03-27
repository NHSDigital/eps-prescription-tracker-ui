import React from "react"
import {Button} from "../ReactRouterButton"

export default function PrescriptionIdSearch() {
  return (
    <>
      <h1 data-testid="prescription-id-search-heading">Prescription ID Search</h1>
      <div className="eps-modal-button-group" data-testid="prescription-id-search-button-group">
        <Button
          className="nhsuk-button eps-modal-button"
          to="/prescription-results?prescriptionId=123456"
          data-testid="find-prescription-button"
        >
                    Find a prescription
        </Button>
      </div>
    </>
  )
}
