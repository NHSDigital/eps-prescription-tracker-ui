import React from "react"
import {
  render,
  screen,
  fireEvent,
  waitFor
} from "@testing-library/react"
import PrescriptionsListTable from "@/components/prescriptionList/PrescriptionsListTable"
import {PrescriptionsListStrings} from "@/constants/ui-strings/PrescriptionListTabStrings"
import {PrescriptionSummary, TreatmentType} from "@cpt-ui-common/common-types"

jest.mock("@/helpers/statusMetadata", () => ({
  getStatusTagColour: jest.fn().mockReturnValue("blue"),
  getStatusDisplayText: jest.fn().mockReturnValue("Available to download")
}))

describe("PrescriptionsListTable", () => {
  const textContent: PrescriptionsListStrings = {
    heading: "Current Prescriptions",
    testid: "current",
    noPrescriptionsMessage: "No current prescriptions found."
  }

  const prescriptions: Array<PrescriptionSummary> = [
    {
      prescriptionId: "C0C757-A83008-C2D93O",
      statusCode: "0001",
      issueDate: "2025-03-01",
      prescriptionTreatmentType: TreatmentType.ACUTE,
      issueNumber: 1,
      maxRepeats: 5,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    },
    {
      prescriptionId: "209E3D-A83008-327F9F",
      statusCode: "0002",
      issueDate: "2025-03-10",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 2,
      maxRepeats: 5,
      prescriptionPendingCancellation: true,
      itemsPendingCancellation: false
    },
    {
      prescriptionId: "209E3D-A83008-327FXZ",
      statusCode: "0003",
      issueDate: "2025-02-15",
      prescriptionTreatmentType: TreatmentType.REPEAT,
      issueNumber: 3,
      maxRepeats: 10,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: true
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("displays loading spinner initially", () => {
    render(<PrescriptionsListTable textContent={textContent} prescriptions={prescriptions} />)

    expect(screen.getByTestId("eps-loading-spinner")).toBeInTheDocument()
  })

  it("displays the prescriptions table after loading", async () => {
    jest.useFakeTimers()
    render(<PrescriptionsListTable textContent={textContent} prescriptions={prescriptions} />)
    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.queryByTestId("eps-loading-spinner")).not.toBeInTheDocument()
      expect(screen.getByTestId("eps-prescription-table-container")).toBeInTheDocument()
      expect(screen.getByTestId("current-prescriptions-results-table")).toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  it("shows a message when no prescriptions are available", async () => {
    jest.useFakeTimers()
    render(<PrescriptionsListTable textContent={textContent} prescriptions={[]} />)
    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText("No current prescriptions found.")).toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  it("sorts the table when a column header is clicked", async () => {
    jest.useFakeTimers()
    render(<PrescriptionsListTable textContent={textContent} prescriptions={prescriptions} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const rows = screen.getAllByTestId("eps-prescription-table-sort-button")
      const firstRowDate = rows[0].querySelector("[data-testid='issue-date-column']")
      expect(firstRowDate?.textContent).toContain("10-Mar-2025")
    })

    const issueDateSortButton = screen.getByTestId("eps-prescription-table-sort-issueDate")
    fireEvent.click(issueDateSortButton)

    await waitFor(() => {
      const rows = screen.getAllByTestId("eps-prescription-table-sort-button")
      const firstRowDate = rows[0].querySelector("[data-testid='issue-date-column']")
      expect(firstRowDate?.textContent).toContain("15-Feb-2025") // Oldest date
    })

    jest.useRealTimers()
  })

  it("renders the correct table description based on testid", async () => {
    jest.useFakeTimers()

    const futureTextContent = {
      ...textContent,
      testid: "future"
    }

    render(<PrescriptionsListTable textContent={futureTextContent} prescriptions={prescriptions} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const table = screen.getByTestId("future-prescriptions-results-table")
      const caption = table.querySelector("caption")
      expect(caption).toHaveClass("nhsuk-u-visually-hidden")
      expect(caption?.textContent).toContain("A sortable table showing future-dated prescriptions")
    })

    jest.useRealTimers()
  })

  it("displays the correct number of prescriptions info text", async () => {
    jest.useFakeTimers()
    render(<PrescriptionsListTable textContent={textContent} prescriptions={prescriptions} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const summaryRow = screen.getByTestId("table-summary-row")
      expect(summaryRow).toHaveTextContent("Showing 3 of 3")
      expect(summaryRow).toHaveAttribute("aria-label", "Showing 3 of 3 prescriptions")
    })

    jest.useRealTimers()
  })
})
