import React from "react"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  CURRENT_PRESCRIPTIONS,
  FUTURE_PRESCRIPTIONS,
  PAST_PRESCRIPTIONS,
  PRESCRIPTION_LIST_TABS,
  PrescriptionsListStrings
} from "@/constants/ui-strings/PrescriptionListTabStrings"

import {PrescriptionSummary, TreatmentType} from "@cpt-ui-common/common-types"

// This mock just displays the data. Nothing fancy!
jest.mock("@/components/prescriptionList/PrescriptionsList", () => {
  return function DummyPrescriptionsList({
    textContent,
    prescriptions
  }: {
    textContent: PrescriptionsListStrings
    prescriptions: Array<PrescriptionSummary>
  }) {
    return (
      <div data-testid={textContent.testid}>
        <p>{textContent.heading}</p>
        <p>Count: {prescriptions.length}</p>
      </div>
    )
  }
})

import PrescriptionsListTabs from "@/components/prescriptionList/PrescriptionsListTab"

describe("PrescriptionsListTabs", () => {
  const currentPrescriptions: Array<PrescriptionSummary> = [
    {
      prescriptionId: "RX001",
      statusCode: "001",
      issueDate: "2025-03-01",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 1,
      maxRepeats: 5,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    },
    {
      prescriptionId: "RX002",
      statusCode: "002",
      issueDate: "2025-03-02",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 1,
      maxRepeats: 5,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    }
  ]

  const pastPrescriptions: Array<PrescriptionSummary> = [
    {
      prescriptionId: "RX003",
      statusCode: "003",
      issueDate: "2025-01-01",
      prescriptionTreatmentType: TreatmentType.ACUTE,
      issueNumber: 1,
      maxRepeats: 5,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    }
  ]

  const futurePrescriptions: Array<PrescriptionSummary> = [
    {
      prescriptionId: "RX004",
      statusCode: "004",
      issueDate: "2025-04-01",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 1,
      maxRepeats: 5,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    },
    {
      prescriptionId: "RX005",
      statusCode: "005",
      issueDate: "2025-04-02",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 1,
      maxRepeats: 5,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    },
    {
      prescriptionId: "RX006",
      statusCode: "006",
      issueDate: "2025-04-03",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 1,
      maxRepeats: 5,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    }
  ]

  beforeEach(() => {
    render(
      <PrescriptionsListTabs
        currentPrescriptions={currentPrescriptions}
        pastPrescriptions={pastPrescriptions}
        futurePrescriptions={futurePrescriptions}
      />
    )
  })

  it("renders tab headers with correct counts", () => {
    PRESCRIPTION_LIST_TABS.forEach((tab) => {
      let count = 0
      if (tab.targetId === "current") {
        count = currentPrescriptions.length
      } else if (tab.targetId === "future") {
        count = futurePrescriptions.length
      } else if (tab.targetId === "past") {
        count = pastPrescriptions.length
      }
      expect(
        screen.getByText(`${tab.title} (${count})`)
      ).toBeInTheDocument()
    })
  })

  it("displays the correct PrescriptionsList for the default active tab", () => {
    // Click on nothing - should default to current prescriptions
    const list = screen.getByTestId(CURRENT_PRESCRIPTIONS.testid)
    expect(list).toHaveTextContent(CURRENT_PRESCRIPTIONS.heading)
    expect(list).toHaveTextContent(`Count: ${currentPrescriptions.length}`)
  })

  it("switches to the future tab and displays correct content", async () => {
    // Click on the "Future" tab
    const futureTabHeader = screen.getByText(
      `${PRESCRIPTION_LIST_TABS.find((tab) => tab.targetId === "future")?.title} (${futurePrescriptions.length})`
    )
    await userEvent.click(futureTabHeader)

    expect(screen.getByTestId(FUTURE_PRESCRIPTIONS.testid)).toHaveTextContent(
      FUTURE_PRESCRIPTIONS.heading
    )
    expect(screen.getByTestId(FUTURE_PRESCRIPTIONS.testid)).toHaveTextContent(
      `Count: ${futurePrescriptions.length}`
    )
  })

  it("switches to the past tab and displays correct content", async () => {
    // Click on the "Past" tab
    const pastTabHeader = screen.getByText(
      `${PRESCRIPTION_LIST_TABS.find((tab) => tab.targetId === "past")?.title} (${pastPrescriptions.length})`
    )
    await userEvent.click(pastTabHeader)

    expect(screen.getByTestId(PAST_PRESCRIPTIONS.testid)).toHaveTextContent(
      PAST_PRESCRIPTIONS.heading
    )
    expect(screen.getByTestId(PAST_PRESCRIPTIONS.testid)).toHaveTextContent(
      `Count: ${pastPrescriptions.length}`
    )
  })
})
