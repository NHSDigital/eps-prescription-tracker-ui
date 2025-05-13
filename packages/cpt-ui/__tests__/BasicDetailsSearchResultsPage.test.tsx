import React from "react"
import {render, screen, fireEvent} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import BasicDetailsSearchResultsPage from "@/pages/BasicDetailsSearchResultsPage"
import {SearchResultsPageStrings} from "@/constants/ui-strings/BasicDetailsSearchResultsPageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate
}))

// TODO: update tests when the actual data is queriable so we aren't testing against hardcoded values.
describe("BasicDetailsSearchResultsPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it("renders the page title and results count", () => {
    render(
      <MemoryRouter>
        <BasicDetailsSearchResultsPage />
      </MemoryRouter>
    )

    expect(screen.getByText(SearchResultsPageStrings.TITLE)).toBeInTheDocument()
    expect(screen.getByText(SearchResultsPageStrings.RESULTS_COUNT.replace("{count}", "2"))).toBeInTheDocument()
  })

  it("renders the table headers correctly", () => {
    render(
      <MemoryRouter>
        <BasicDetailsSearchResultsPage />
      </MemoryRouter>
    )

    const tableHeaders = screen.getAllByRole("columnheader")
    expect(tableHeaders).toHaveLength(5)
    expect(tableHeaders[0]).toHaveTextContent(SearchResultsPageStrings.TABLE.NAME)
    expect(tableHeaders[1]).toHaveTextContent(SearchResultsPageStrings.TABLE.GENDER)
    expect(tableHeaders[2]).toHaveTextContent(SearchResultsPageStrings.TABLE.DOB)
    expect(tableHeaders[3]).toHaveTextContent(SearchResultsPageStrings.TABLE.ADDRESS)
    expect(tableHeaders[4]).toHaveTextContent(SearchResultsPageStrings.TABLE.NHS_NUMBER)
  })

  it("renders patient data correctly", () => {
    render(
      <MemoryRouter>
        <BasicDetailsSearchResultsPage />
      </MemoryRouter>
    )

    // Check first patient
    expect(screen.getByText("Issac Wolderton-Rodriguez")).toBeInTheDocument()
    expect(screen.getAllByText("Male")[0]).toBeInTheDocument()
    expect(screen.getAllByText("6-May-2013")[0]).toBeInTheDocument()
    expect(screen.getAllByText("123 Brundel Close, Headingley, Leeds, West Yorkshire, LS6 1JL")[0]).toBeInTheDocument()
    expect(screen.getByText("972 691 9207")).toBeInTheDocument()

    // Check second patient
    expect(screen.getByText("Steve Wolderton-Rodriguez")).toBeInTheDocument()
    expect(screen.getAllByText("Male")[1]).toBeInTheDocument()
    expect(screen.getAllByText("6-May-2013")[1]).toBeInTheDocument()
    expect(screen.getAllByText("123 Brundel Close, Headingley, Leeds, West Yorkshire, LS6 1JL")[1]).toBeInTheDocument()
    expect(screen.getByText("972 591 9207")).toBeInTheDocument()
  })

  it("navigates to prescription list when clicking a patient row", () => {
    render(
      <MemoryRouter>
        <BasicDetailsSearchResultsPage />
      </MemoryRouter>
    )

    const firstPatientRow = screen.getByText("Issac Wolderton-Rodriguez").closest("tr")
    fireEvent.click(firstPatientRow!)

    expect(mockNavigate).toHaveBeenCalledWith(
      `${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?nhsNumber=9726919207`
    )
  })

  it("navigates to prescription list when clicking a patient name link", () => {
    render(
      <MemoryRouter>
        <BasicDetailsSearchResultsPage />
      </MemoryRouter>
    )

    const patientNameLink = screen.getByText("Issac Wolderton-Rodriguez")
    fireEvent.click(patientNameLink)

    expect(mockNavigate).toHaveBeenCalledWith(
      `${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?nhsNumber=9726919207`
    )
  })

  it("navigates back when clicking the back link", () => {
    render(
      <MemoryRouter>
        <BasicDetailsSearchResultsPage />
      </MemoryRouter>
    )

    const backLink = screen.getByText(SearchResultsPageStrings.GO_BACK)
    fireEvent.click(backLink)

    expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS, {
      state: {clear: true}
    })
  })

  it("handles keyboard navigation for patient rows", () => {
    render(
      <MemoryRouter>
        <BasicDetailsSearchResultsPage />
      </MemoryRouter>
    )

    const firstPatientRow = screen.getByText("Issac Wolderton-Rodriguez").closest("tr")

    // Test Enter key
    fireEvent.keyDown(firstPatientRow!, {key: "Enter"})
    expect(mockNavigate).toHaveBeenCalledWith(
      `${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?nhsNumber=9726919207`
    )

    // Reset mock
    mockNavigate.mockClear()

    // Test Space key
    fireEvent.keyDown(firstPatientRow!, {key: " "})
    expect(mockNavigate).toHaveBeenCalledWith(
      `${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?nhsNumber=9726919207`
    )
  })

  it("formats NHS numbers correctly with spaces", () => {
    render(
      <MemoryRouter>
        <BasicDetailsSearchResultsPage />
      </MemoryRouter>
    )

    expect(screen.getByText("972 691 9207")).toBeInTheDocument()
    expect(screen.getByText("972 591 9207")).toBeInTheDocument()
  })

  it("provides correct accessibility labels for patient rows", () => {
    render(
      <MemoryRouter>
        <BasicDetailsSearchResultsPage />
      </MemoryRouter>
    )

    const firstPatientRow = screen.getByText("Issac Wolderton-Rodriguez").closest("tr")
    expect(firstPatientRow).toHaveAttribute(
      "aria-label",
      SearchResultsPageStrings.ACCESSIBILITY.PATIENT_ROW
        .replace("{name}", "Issac Wolderton-Rodriguez")
        .replace("{nhsNumber}", "9726919207")
    )
  })
})
