import React from "react"
import {useLocation} from "react-router-dom"

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
    "/prescription-list-current": (
      <PrescriptionsListTable
        textContent={CURRENT_PRESCRIPTIONS}
        prescriptions={currentPrescriptions}
      />
    ),
    "/prescription-list-past": (
      <PrescriptionsListTable
        textContent={PAST_PRESCRIPTIONS}
        prescriptions={pastPrescriptions}
      />
    ),
    "/prescription-list-future": (
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
