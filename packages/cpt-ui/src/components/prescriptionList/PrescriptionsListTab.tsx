import React from "react"
import {useLocation} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {
  CURRENT_PRESCRIPTIONS,
  FUTURE_PRESCRIPTIONS,
  PAST_PRESCRIPTIONS
} from "@/constants/ui-strings/PrescriptionListTabStrings"

import {PrescriptionSummary} from "@cpt-ui-common/common-types/src"
import PrescriptionsListTable from "@/components/prescriptionList/PrescriptionsListTable"
import EpsTabs, {TabHeader} from "@/components/EpsTabs"

export interface PrescriptionsListTabsProps {
  tabData: Array<TabHeader>
  currentPrescriptions: Array<PrescriptionSummary>
  pastPrescriptions: Array<PrescriptionSummary>
  futurePrescriptions: Array<PrescriptionSummary>
}

export default function PrescriptionsListTabs({
  tabData,
  currentPrescriptions,
  pastPrescriptions,
  futurePrescriptions
}: PrescriptionsListTabsProps) {
  const location = useLocation()
  const pathname = location.pathname

  const pathContent: Record<string, React.ReactNode> = {
    [FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT]: (
      <PrescriptionsListTable
        textContent={CURRENT_PRESCRIPTIONS}
        prescriptions={currentPrescriptions}
      />
    ),
    [FRONTEND_PATHS.PRESCRIPTION_LIST_PAST]: (
      <PrescriptionsListTable
        textContent={PAST_PRESCRIPTIONS}
        prescriptions={pastPrescriptions}
      />
    ),
    [FRONTEND_PATHS.PRESCRIPTION_LIST_FUTURE]: (
      <PrescriptionsListTable
        textContent={FUTURE_PRESCRIPTIONS}
        prescriptions={futurePrescriptions}
      />
    )
  }

  const content = pathContent[pathname] || pathContent["/prescription-list-current"]

  return (
    <EpsTabs
      activeTabPath={pathname + window.location.search}
      tabHeaderArray={tabData}
    >
      {content}
    </EpsTabs>
  )
}
