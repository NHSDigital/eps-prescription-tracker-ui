import React from "react"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  MemoryRouter,
  Route,
  Routes,
  useLocation
} from "react-router-dom"

import {PrescriptionsListStrings} from "@/constants/ui-strings/PrescriptionListTabStrings"
import {PrescriptionSummary, TreatmentType} from "@cpt-ui-common/common-types"

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
      prescriptionId: "C0C757-A83008-C2D93O",
      statusCode: "001",
      issueDate: "2025-03-01",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 1,
      maxRepeats: 5,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    },
    {
      prescriptionId: "209E3D-A83008-327F9F",
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

  describe("with default mock data", () => {
    beforeEach(() => {
      const page = (
        <PrescriptionsListTabs
          tabData={tabData}
          currentPrescriptions={currentPrescriptions}
          futurePrescriptions={futurePrescriptions}
          pastPrescriptions={pastPrescriptions}
        />
      )
      render(
        <MemoryRouter>
          <Routes>
            <Route path="*" element={page} />
          </Routes>
        </MemoryRouter>
      )
    })

    it("renders tab headers", () => {
      tabData.forEach((tab) => {
        expect(screen.getByText(tab.title)).toBeInTheDocument()
      })
    })

    it("displays the correct PrescriptionsList for the default active tab", () => {
      const list = screen.getByTestId(`eps-tab-heading ${tabData[0].link}`)
      expect(list).toHaveTextContent(tabData[0].title)
      expect(screen.getByTestId("mock-prescription-data")).toHaveTextContent(
        `Count: ${currentPrescriptions.length}`
      )
    })

    it("switches to the future tab and displays correct content", async () => {
      const futureTabHeader = screen.getByText("Future Prescriptions")
      await userEvent.click(futureTabHeader)

      expect(screen.getByTestId(`eps-tab-heading ${tabData[1].link}`)).toHaveTextContent(
        tabData[1].title
      )
      expect(screen.getByTestId("mock-prescription-data")).toHaveTextContent(
        `Count: ${futurePrescriptions.length}`
      )
    })

    it("switches to the past tab and displays correct content", async () => {
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

  it("shows dispensed prescriptions in the Current Prescriptions tab", () => {
    const mockDispensedPrescription: PrescriptionSummary = {
      prescriptionId: "MOCK-DISPENSED-TEST",
      statusCode: "0006",
      issueDate: "2025-06-15",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 1,
      maxRepeats: 2,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    }

    const testPage = (
      <PrescriptionsListTabs
        tabData={tabData}
        currentPrescriptions={[mockDispensedPrescription]}
        futurePrescriptions={[]}
        pastPrescriptions={[]}
      />
    )

    render(
      <MemoryRouter initialEntries={["/prescription-list-current"]}>
        <Routes>
          <Route path="*" element={testPage} />
        </Routes>
      </MemoryRouter>
    )

    const mockDataElements = screen.getAllByTestId("mock-prescription-data")
    expect(mockDataElements.some(el => el.textContent?.includes("Count: 1"))).toBe(true)
    expect(screen.getByText("Current Prescriptions")).toBeInTheDocument()
  })
})
