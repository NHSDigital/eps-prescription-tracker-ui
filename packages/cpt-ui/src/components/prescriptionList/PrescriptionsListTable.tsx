import React from "react"

import {PrescriptionsListStrings} from "@/constants/ui-strings/PrescriptionListTabStrings"
import {PrescriptionSummary} from "@cpt-ui-common/common-types"

export interface PrescriptionsListTableProps {
    textContent: PrescriptionsListStrings,
    prescriptions: Array<PrescriptionSummary>
}

export default function PrescriptionsListTable({textContent, prescriptions}: PrescriptionsListTableProps) {
  return (
    <>
      <div data-testid={textContent.testid} />
      <p>{textContent.heading}</p>
      <p>{JSON.stringify(prescriptions)}</p>
    </>
  )
}
