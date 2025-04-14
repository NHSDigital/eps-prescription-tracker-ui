import React from "react"
import {useLocation} from "react-router-dom"

// import {
//   CURRENT_PRESCRIPTIONS,
//   FUTURE_PRESCRIPTIONS,
//   PAST_PRESCRIPTIONS
// } from "@/constants/ui-strings/PrescriptionListTabStrings"

import {PrescriptionSummary} from "@cpt-ui-common/common-types/src"

// import PrescriptionsListTable from "@/components/prescriptionList/PrescriptionsListTable"
import EpsTabs, {TabHeader} from "@/components/EpsTabs"

import {EPSPrescriptionTable} from "@/components/EPSPrescriptionTable"

export interface PrescriptionsListTabsProps {
    tabData: Array<TabHeader>
    currentPrescriptions: Array<PrescriptionSummary>,
    pastPrescriptions: Array<PrescriptionSummary>,
    futurePrescriptions: Array<PrescriptionSummary>,
    prescriptionCount: number
}

export default function PrescriptionsListTabs({
  tabData,
  currentPrescriptions,
  pastPrescriptions,
  futurePrescriptions,
  prescriptionCount
}: PrescriptionsListTabsProps) {
  const location = useLocation()
  const pathname = location.pathname

  //DO WE NEED BELOW?
  // const currentTable =
  //   <PrescriptionsListTable
  //     textContent={CURRENT_PRESCRIPTIONS}
  //     prescriptions={currentPrescriptions}
  //   />
  // const pastTable =
  //     <PrescriptionsListTable
  //       textContent={PAST_PRESCRIPTIONS}
  //       prescriptions={pastPrescriptions}
  //     />
  // const futureTable =
  //       <PrescriptionsListTable
  //         textContent={FUTURE_PRESCRIPTIONS}
  //         prescriptions={futurePrescriptions}
  //       />

  // // Map paths to content components. Note that we can't use the
  // // FRONTEND_PATHS object here, because typescript completely falls over if we do...
  // const pathContent: Record<string, React.ReactNode> = {
  //   "/prescription-list-current": currentTable,
  //   "/prescription-list-future": futureTable,
  //   "/prescription-list-past": pastTable
  // }

  // // Default to prescription ID search if path not found
  // const content = pathContent[pathname] || currentTable

  const getActiveTab = (path: string): "current" | "past" | "future" => {
    if (path.includes("current")) return "current"
    if (path.includes("future")) return "future"
    if (path.includes("past")) return "past"
    return "current"
  }

  const activeTab = getActiveTab(pathname)

  return (
    <EpsTabs
      // The active tab needs to include the query parameters in order to get labelled correctly
      activeTabPath={pathname+window.location.search}
      tabHeaderArray={tabData}
    >
      <EPSPrescriptionTable
        currentPrescriptions={currentPrescriptions}
        pastPrescriptions={pastPrescriptions}
        futurePrescriptions={futurePrescriptions}
        prescriptionCount={prescriptionCount}
        activeTab={activeTab}/>
    </EpsTabs>
  )
}
