import React from "react"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  BrowserRouter,
  Route,
  Routes,
  useLocation
} from "react-router-dom"

import {PrescriptionsListStrings} from "@/constants/ui-strings/PrescriptionListTabStrings"

import {PrescriptionSummary, TreatmentType} from "@cpt-ui-common/common-types"

// This mock just displays the data. Nothing fancy!
jest.mock("@/components/prescriptionList/PrescriptionsListTable", () => {
  return function DummyPrescriptionsList({
    textContent,
    prescriptions
  }: {
    textContent: PrescriptionsListStrings
    prescriptions: Array<PrescriptionSummary>
  }) {
    const location = useLocation()
    return (
      <div data-testid={textContent.testid}>
        <p>{textContent.heading}</p>
        <p data-testid="mock-prescription-data">Count: {prescriptions.length}</p>
        <p>{location.pathname}</p>
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

  const tabData = [
    {
      title: "Current Prescriptions",
      link: "/prescription-list-current"
    },
    {
      title: "Future Prescriptions",
      link: "/prescription-list-future"
    },
    {
      title: "Past Prescriptions",
      link: "/prescription-list-past"
    }
  ]

  beforeEach(() => {
    const page =
      <PrescriptionsListTabs
        tabData={tabData}
        currentPrescriptions={currentPrescriptions}
        futurePrescriptions={futurePrescriptions}
        pastPrescriptions={pastPrescriptions}
      />
    render(
      <BrowserRouter>
        <Routes>
          <Route path="*" element={page} />
        </Routes>
      </BrowserRouter>
    )
  })

  it("renders tab headers", () => {
    tabData.forEach((tab) => {
      expect(
        screen.getByText(tab.title)
      ).toBeInTheDocument()
    })
  })

  it("displays the correct PrescriptionsList for the default active tab", () => {
    // Click on nothing - should default to current prescriptions
    const list = screen.getByTestId(`eps-tab-heading ${tabData[0].link}`)
    expect(list).toHaveTextContent(tabData[0].title)
    expect(screen.getByTestId("mock-prescription-data")).toHaveTextContent(
      `Count: ${currentPrescriptions.length}`
    )
  })

  it("switches to the future tab and displays correct content", async () => {
    // Click on the "Future" tab
    const futureTabHeader = screen.getByText("Future Prescriptions")
    await userEvent.click(futureTabHeader)

    console.log(screen.debug())

    expect(screen.getByTestId(`eps-tab-heading ${tabData[1].link}`)).toHaveTextContent(
      tabData[1].title
    )
    expect(screen.getByTestId("mock-prescription-data")).toHaveTextContent(
      `Count: ${futurePrescriptions.length}`
    )
  })

  it("switches to the past tab and displays correct content", async () => {
    // Click on the "Past" tab
    const pastTabHeader = screen.getByText("Past Prescriptions")
    await userEvent.click(pastTabHeader)

    expect(screen.getByTestId(`eps-tab-heading ${tabData[2].link}`)).toHaveTextContent(
      tabData[2].title
    )
    expect(screen.getByTestId("mock-prescription-data")).toHaveTextContent(
      `Count: ${pastPrescriptions.length}`
    )
  })
})
