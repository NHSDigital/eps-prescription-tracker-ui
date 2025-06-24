import React from "react"
import {
  screen,
  fireEvent,
  waitFor,
  render
} from "@testing-library/react"
import PrescriptionsListTable from "@/components/prescriptionList/PrescriptionsListTable"
import {PrescriptionsListStrings} from "@/constants/ui-strings/PrescriptionListTabStrings"
import {PrescriptionSummary, TreatmentType} from "@cpt-ui-common/common-types"
import {MemoryRouter} from "react-router-dom"

jest.mock("@/helpers/statusMetadata", () => ({
  getStatusTagColour: jest.fn().mockReturnValue("blue"),
  getStatusDisplayText: jest.fn().mockReturnValue("Available to download"),
  formatDateForPrescriptions: jest.fn((date: string) => "Formatted: " + date)
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

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <MemoryRouter>
        {component}
      </MemoryRouter>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the full table container, table, and table head when prescriptions exist", async () => {
    jest.useFakeTimers()

    renderWithRouter(<PrescriptionsListTable textContent={textContent} prescriptions={prescriptions} />)

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

    renderWithRouter(<PrescriptionsListTable textContent={futureTextContent} prescriptions={prescriptions} />)

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

    renderWithRouter(<PrescriptionsListTable textContent={expiredTextContent} prescriptions={prescriptions} />)

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
    renderWithRouter(<PrescriptionsListTable textContent={textContent} prescriptions={[]} />)
    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText("No current prescriptions found.")).toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  it("sorts the table when a column header is clicked", async () => {
    jest.useFakeTimers()
    renderWithRouter(<PrescriptionsListTable textContent={textContent} prescriptions={prescriptions} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const rows = screen.getAllByTestId("eps-prescription-table-row")
      const firstRowDate = rows[0].querySelector("[data-testid='issue-date-column']")
      expect(firstRowDate?.textContent).toContain("Formatted: 2025-03-10")
    })

    const issueDateSortButton = screen.getByTestId("eps-prescription-table-sort-issueDate")
    fireEvent.click(issueDateSortButton)

    await waitFor(() => {
      const rows = screen.getAllByTestId("eps-prescription-table-row")
      const firstRowDate = rows[0].querySelector("[data-testid='issue-date-column']")
      expect(firstRowDate?.textContent).toContain("Formatted: 2025-02-15") // Oldest date
    })

    jest.useRealTimers()
  })

  it("renders the correct table description based on testid", async () => {
    jest.useFakeTimers()

    const futureTextContent = {
      ...textContent,
      testid: "future"
    }

    renderWithRouter(<PrescriptionsListTable textContent={futureTextContent} prescriptions={prescriptions} />)

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
    renderWithRouter(<PrescriptionsListTable textContent={textContent} prescriptions={prescriptions} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const summaryRow = screen.getByTestId("table-summary-row")
      expect(summaryRow).toHaveTextContent("Showing 3 of 3")
    })

    jest.useRealTimers()
  })

  it("sorts prescriptions by cancellation warning when header is clicked", async () => {
    jest.useFakeTimers()

    renderWithRouter(<PrescriptionsListTable textContent={textContent} prescriptions={prescriptions} />)

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByTestId("current-prescriptions-results-table")).toBeInTheDocument()
    })

    const cancellationHeader = screen.getByTestId("eps-prescription-table-sort-cancellationWarning")
    fireEvent.click(cancellationHeader)

    await waitFor(() => {
      const rows = screen.getAllByTestId("eps-prescription-table-row")

      const firstRow = rows[0]

      expect(firstRow).toHaveTextContent("C0C757-A83008-C2D93O")
    })

    jest.useRealTimers()
  })
  it("renders noPrescriptionsMessage when prescriptions array is empty", async () => {
    jest.useFakeTimers()

    renderWithRouter(<PrescriptionsListTable textContent={textContent} prescriptions={[]} />)

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

    renderWithRouter(<PrescriptionsListTable textContent={textContent} prescriptions={prescriptions} />)
    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const sortButton = screen.getByTestId("eps-prescription-table-sort-issueDate")

      expect(sortButton).toBeInTheDocument()
      expect(sortButton).toHaveAttribute("role", "button")
      expect(sortButton).toHaveAttribute("tabIndex", "0")

      fireEvent.click(sortButton)

      fireEvent.keyDown(sortButton, {key: "Enter"})
      fireEvent.keyDown(sortButton, {key: " "})
    })

    jest.useRealTimers()
  })

  it("sorts prescriptions by statusCode, falling back to issueDate if statusCodes match", async () => {
    jest.useFakeTimers()

    const testPrescriptions = [
      {
        prescriptionId: "88AAF5-A83008-3D404Q",
        statusCode: "0002",
        issueDate: "2025-04-15",
        prescriptionTreatmentType: TreatmentType.REPEAT,
        issueNumber: 3,
        maxRepeats: 6,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: false
      },
      {
        prescriptionId: "7F1A4B-A83008-91DC2E",
        statusCode: "0002",
        issueDate: "2025-04-10",
        prescriptionTreatmentType: TreatmentType.REPEAT,
        issueNumber: 2,
        maxRepeats: 5,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: false
      },
      {
        prescriptionId: "4D6F2C-A83008-A3E7D1",
        statusCode: "0003",
        issueDate: "2025-04-01",
        prescriptionTreatmentType: TreatmentType.REPEAT,
        issueNumber: 1,
        maxRepeats: 4,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: false
      }
    ]

    renderWithRouter(
      <PrescriptionsListTable textContent={textContent} prescriptions={testPrescriptions} />
    )

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const sortButton = screen.getByTestId("eps-prescription-table-sort-issueDate")
      fireEvent.click(sortButton)

      const rows = screen.getAllByRole("row")
      const dataRows = rows.slice(1)

      const firstRowText = dataRows[0].textContent
      const secondRowText = dataRows[1].textContent
      const thirdRowText = dataRows[2].textContent

      expect(firstRowText).toContain("2")
      expect(secondRowText).toContain("3")
      expect(thirdRowText).toContain("1")
    })

    jest.useRealTimers()
  })
  it("sorts prescriptions by issueNumber in ascending order", async () => {
    jest.useFakeTimers()

    renderWithRouter(<PrescriptionsListTable textContent={textContent} prescriptions={prescriptions} />)
    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const sortButton = screen.getByTestId("eps-prescription-table-sort-issueDate")
      fireEvent.click(sortButton)

      const rows = screen.getAllByTestId("eps-prescription-table-row")
      expect(rows[0]).toHaveTextContent("1")
      expect(rows[1]).toHaveTextContent("2")
      expect(rows[2]).toHaveTextContent("3")
    })

    jest.useRealTimers()
  })

  it("renders unavailable text when statusCode is 0005", async () => {
    jest.useFakeTimers()

    const unavailablePrescription = {
      prescriptionId: "474201-A83008-40C08U",
      statusCode: "0005",
      issueDate: "2025-06-01",
      prescriptionTreatmentType: TreatmentType.ACUTE,
      issueNumber: 1,
      maxRepeats: 1,
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    }

    renderWithRouter(
      <PrescriptionsListTable
        textContent={textContent}
        prescriptions={[unavailablePrescription]}
      />
    )

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const unavailableElement = screen.getByTestId("unavailable-text-474201-A83008-40C08U")
      expect(unavailableElement).toBeInTheDocument()
    })

    jest.useRealTimers()
  })
})
