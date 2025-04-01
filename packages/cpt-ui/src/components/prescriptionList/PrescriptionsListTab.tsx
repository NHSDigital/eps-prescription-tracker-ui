import React from "react"
import {Tabs} from "nhsuk-react-components"

import PrescriptionsListTable from "@/components/prescriptionList/PrescriptionsListTable"

import {
  CURRENT_PRESCRIPTIONS,
  FUTURE_PRESCRIPTIONS,
  PAST_PRESCRIPTIONS,
  PRESCRIPTION_LIST_TABS
} from "@/constants/ui-strings/PrescriptionListTabStrings"
import {PrescriptionSummary} from "@cpt-ui-common/common-types"

export interface PrescriptionsListTabsProps {
    currentPrescriptions: Array<PrescriptionSummary>,
    pastPrescriptions: Array<PrescriptionSummary>,
    futurePrescriptions: Array<PrescriptionSummary>
}

interface PrescriptionCounts {
    current: number,
    past: number,
    future: number
}

export default function PrescriptionsListTabs({
  currentPrescriptions,
  pastPrescriptions,
  futurePrescriptions
}: PrescriptionsListTabsProps) {
  const tabData = PRESCRIPTION_LIST_TABS
  // Will update when the component re-renders, so no useEffect needed here
  const prescriptionCounts: PrescriptionCounts = {
    current: currentPrescriptions.length,
    future: futurePrescriptions.length,
    past: pastPrescriptions.length
  }

  return (
    <Tabs defaultValue={tabData[0].targetId}>
      <Tabs.Title>Contents</Tabs.Title>
      <Tabs.List>
        {tabData.map(tabHeader => {
          const count = prescriptionCounts[tabHeader.targetId as keyof typeof prescriptionCounts] || 0
          return (
            <Tabs.ListItem
              id={tabHeader.targetId}
              key={tabHeader.title}
            >
              <div
                data-testid={`prescription-results-list-tab-heading ${tabHeader.targetId}`}
              >
                {`${tabHeader.title} (${count})`}
              </div>
            </Tabs.ListItem>
          )
        })}
      </Tabs.List>
      {tabData.map(tabContent => (
        <Tabs.Contents id={tabContent.targetId} key={tabContent.title}>
          <div>
            {
              (tabContent.targetId === "current" && (
                <PrescriptionsListTable
                  textContent={CURRENT_PRESCRIPTIONS}
                  prescriptions={currentPrescriptions}
                />
              )) ||
              (tabContent.targetId === "future" && (
                <PrescriptionsListTable
                  textContent={FUTURE_PRESCRIPTIONS}
                  prescriptions={futurePrescriptions}
                />
              )) ||
              (tabContent.targetId === "past" && (
                <PrescriptionsListTable
                  textContent={PAST_PRESCRIPTIONS}
                  prescriptions={pastPrescriptions}
                />
              )) ||
              <p>This Search not available</p>
            }
          </div>
        </Tabs.Contents>
      ))}
    </Tabs>
  )
}
