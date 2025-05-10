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
  const futureTextContent = {...textContent, testid: "future"}
  const expiredTextContent = {...textContent, testid: "claimedExpired"}

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

  it("renders the full table container, table, and table head when prescriptions exist", async () => {
    jest.useFakeTimers()

    render(<PrescriptionsListTable textContent={textContent} prescriptions={prescriptions} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const container = screen.getByTestId("eps-prescription-table-container")
      const table = screen.getByTestId(`${textContent.testid}-prescriptions-results-table`)
      const tableHead = table.querySelector("thead")
      const firstRow = tableHead?.querySelector("tr")

      expect(container).toBeInTheDocument()
      expect(table).toBeInTheDocument()
      expect(tableHead).toBeInTheDocument()
      expect(firstRow).toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  it("renders the future prescriptions correctly", async () => {
    jest.useFakeTimers()

    render(<PrescriptionsListTable textContent={futureTextContent} prescriptions={prescriptions} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const table = screen.getByTestId("future-prescriptions-results-table")
      expect(table).toBeInTheDocument()

      const caption = table.querySelector("caption")
      expect(caption?.textContent).toContain("A sortable table showing future-dated prescriptions")
    })

    jest.useRealTimers()
  })

  it("renders the expired prescriptions correctly", async () => {
    jest.useFakeTimers()

    render(<PrescriptionsListTable textContent={expiredTextContent} prescriptions={prescriptions} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const table = screen.getByTestId("claimedExpired-prescriptions-results-table")
      expect(table).toBeInTheDocument()

      const caption = table.querySelector("caption")
      expect(caption?.textContent).toContain("A sortable table showing claimed and expired prescriptions")
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
      expect(summaryRow).toHaveAttribute("aria-label", "Showing 3 of 3")
    })

    jest.useRealTimers()
  })

  it("sorts prescriptions by cancellation warning when header is clicked", async () => {
    jest.useFakeTimers()

    render(<PrescriptionsListTable textContent={textContent} prescriptions={prescriptions} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByTestId("current-prescriptions-results-table")).toBeInTheDocument()
    })

    const cancellationHeader = screen.getByTestId("eps-prescription-table-sort-cancellationWarning")
    fireEvent.click(cancellationHeader)

    await waitFor(() => {
      const rows = screen.getAllByTestId("eps-prescription-table-sort-button")

      const firstRow = rows[0]

      expect(firstRow).toHaveTextContent("C0C757-A83008-C2D93O")
    })

    jest.useRealTimers()
  })
  it("renders noPrescriptionsMessage when prescriptions array is empty", async () => {
    jest.useFakeTimers()

    render(<PrescriptionsListTable textContent={textContent} prescriptions={[]} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const message = screen.getByText(textContent.noPrescriptionsMessage)
      expect(message).toBeInTheDocument()
      expect(message).toHaveClass("nhsuk-body")
    })

    jest.useRealTimers()
  })

  it("responds to click and keyboard interactions on sortable column headers", async () => {
    jest.useFakeTimers()

    render(<PrescriptionsListTable textContent={textContent} prescriptions={prescriptions} />)
    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const sortButton = screen.getByTestId("eps-prescription-table-sort-issueDate")

      // Check that it's rendered with the correct role and label
      expect(sortButton).toBeInTheDocument()
      expect(sortButton).toHaveAttribute("role", "button")
      expect(sortButton).toHaveAttribute("tabIndex", "0")

      // Trigger click
      fireEvent.click(sortButton)

      // Trigger keyboard "Enter"
      fireEvent.keyDown(sortButton, {key: "Enter"})
      // Trigger keyboard "Space"
      fireEvent.keyDown(sortButton, {key: " "})
    })

    jest.useRealTimers()
  })

})
