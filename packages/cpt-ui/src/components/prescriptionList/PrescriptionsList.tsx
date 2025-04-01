import React from "react"

import {PrescriptionsListStrings} from "@/constants/ui-strings/PrescriptionListTabStrings"
import {PrescriptionSummary} from "@cpt-ui-common/common-types"

export interface PrescriptionsListProps {
    textContent: PrescriptionsListStrings,
    prescriptions: Array<PrescriptionSummary>
}

export default function PrescriptionsList({textContent, prescriptions}: PrescriptionsListProps) {
  return (
    <>
      <div data-testid={textContent.testid} />
      <p>{textContent.heading}</p>
      <p>{JSON.stringify(prescriptions)}</p>
    </>
  )
}
