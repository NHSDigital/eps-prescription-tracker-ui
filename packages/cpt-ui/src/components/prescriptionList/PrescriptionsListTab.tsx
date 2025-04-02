import React from "react"
import {useLocation} from "react-router-dom"

import {
  CURRENT_PRESCRIPTIONS,
  FUTURE_PRESCRIPTIONS,
  PAST_PRESCRIPTIONS
} from "@/constants/ui-strings/PrescriptionListTabStrings"

import {PrescriptionSummary} from "@cpt-ui-common/common-types"

import PrescriptionsListTable from "@/components/prescriptionList/PrescriptionsListTable"
import EpsTabs, {TabHeader} from "@/components/EpsTabs"

export interface PrescriptionsListTabsProps {
    tabData: Array<TabHeader>
    currentPrescriptions: Array<PrescriptionSummary>,
    pastPrescriptions: Array<PrescriptionSummary>,
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

  const currentTable =
    <PrescriptionsListTable
      textContent={CURRENT_PRESCRIPTIONS}
      prescriptions={currentPrescriptions}
    />
  const pastTable =
      <PrescriptionsListTable
        textContent={PAST_PRESCRIPTIONS}
        prescriptions={pastPrescriptions}
      />
  const futureTable =
        <PrescriptionsListTable
          textContent={FUTURE_PRESCRIPTIONS}
          prescriptions={futurePrescriptions}
        />

  // Map paths to content components. Note that we can't use the
  // FRONTEND_PATHS object here, because typescript completely falls over if we do...
  const pathContent: Record<string, React.ReactNode> = {
    "/prescription-list-current": currentTable,
    "/prescription-list-future": futureTable,
    "/prescription-list-past": pastTable
  }

  // Default to prescription ID search if path not found
  const content = pathContent[pathname] || currentTable

  return (
    <EpsTabs
      activeTabPath={pathname}
      tabHeaderArray={tabData}
    >
      {content}
    </EpsTabs>
  )
}
