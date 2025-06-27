import React from "react"
import {render, screen, within} from "@testing-library/react"
import {MemoryRouter, Routes, Route} from "react-router-dom"

import PrescriptionNotFoundMessage from "@/components/PrescriptionNotFoundMessage"
import {STRINGS, SEARCH_STRINGS, SEARCH_TYPES} from "@/constants/ui-strings/PrescriptionNotFoundMessageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"

const mockClearSearchParameters = jest.fn()
const mockSetPrescriptionId = jest.fn()
const mockSetIssueNumber = jest.fn()
const mockSetFirstName = jest.fn()
const mockSetLastName = jest.fn()
const mockSetDobDay = jest.fn()
const mockSetDobMonth = jest.fn()
const mockSetDobYear = jest.fn()
const mockSetPostcode =jest.fn()
const mockSetNhsNumber = jest.fn()
const mockGetAllSearchParameters = jest.fn()
const mockSetAllSearchParameters = jest.fn()
const defaultSearchState: SearchProviderContextType = {
  prescriptionId: undefined,
  issueNumber: undefined,
  firstName: undefined,
  lastName: undefined,
  dobDay: undefined,
  dobMonth: undefined,
  dobYear: undefined,
  postcode: undefined,
  nhsNumber: undefined,
  clearSearchParameters: mockClearSearchParameters,
  setPrescriptionId: mockSetPrescriptionId,
  setIssueNumber: mockSetIssueNumber,
  setFirstName: mockSetFirstName,
  setLastName: mockSetLastName,
  setDobDay: mockSetDobDay,
  setDobMonth: mockSetDobMonth,
  setDobYear: mockSetDobYear,
  setPostcode: mockSetPostcode,
  setNhsNumber: mockSetNhsNumber,
  getAllSearchParameters: mockGetAllSearchParameters,
  setAllSearchParameters: mockSetAllSearchParameters
}

const DummyPage = ({label}: {label: string}) => <div data-testid="dummy-page">{label}</div>

interface searchParams {
  prescriptionId?: string
  issueNumber?: string
  firstName?: string
  lastName?: string
  dobDay?: string
  dobMonth?: string
  dobYear?: string
  postcode?: string
  nhsNumber?: string
}
const defaultSearchParams: searchParams = {
  firstName:"Zoe",
  lastName: "Zero",
  dobDay: "31",
  dobMonth: "12",
  dobYear: "2021",
  postcode: "AB1 2CD"
}

// Helper to DRY test setup for different query params
function setupRouter(
  searchParams: searchParams = defaultSearchParams
) {
  const searchState = {
    ...defaultSearchState,
    firstName: searchParams.firstName,
    lastName: searchParams.lastName,
    dobDay: searchParams.dobDay,
    dobMonth: searchParams.dobMonth,
    dobYear: searchParams.dobYear,
    postcode: searchParams.postcode,
    nhsNumber: searchParams.nhsNumber
  }
  render(
    <SearchContext.Provider value={searchState}>
      <MemoryRouter initialEntries={["/not-found"]}>
        <Routes>
          <Route path="/not-found" element={<PrescriptionNotFoundMessage />} />
          <Route path={FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS} element={<DummyPage label="Basic Details Search" />} />
          <Route path={FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER} element={<DummyPage label="NHS Number Search" />} />
          <Route path={FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID} element={
            <DummyPage label="Prescription ID Search" />} />
        </Routes>
      </MemoryRouter>
    </SearchContext.Provider>
  )
}

describe("PrescriptionNotFoundMessage", () => {
  it("renders the main heading and static content for basic details search", () => {
    setupRouter()
    const headings = screen.getAllByTestId("presc-not-found-heading")
    expect(headings[0]).toHaveTextContent(STRINGS.heading)
  })

  it("renders the main container with correct id and class", () => {
    setupRouter()
    const mainElement = screen.getByRole("main")
    expect(mainElement).toBeInTheDocument()
    expect(mainElement).toHaveAttribute("id", "main-content")
    expect(mainElement).toHaveClass("nhsuk-main-wrapper")
  })

  it("renders the back link with correct text for basic details search", () => {
    setupRouter()
    const link = screen.getByTestId("go-back-link")
    expect(link).toHaveTextContent(STRINGS.goBackLink)
    expect(link.getAttribute("href")).toContain(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)
  })

  it("renders all body paragraphs and alternative links for basic details search", () => {
    setupRouter()
    const querySummary = screen.getByTestId("query-summary")

    // First paragraph
    expect(
      within(querySummary).getByText(
        "We could not find any prescriptions using the patient details you searched for."
      )
    ).toBeInTheDocument()

    // Last paragraph
    expect(
      within(querySummary).getByText(
        "If the patient should have a prescription, contact the prescriber."
      )
    ).toBeInTheDocument()

    // Middle paragraph: two links
    const links = within(querySummary).getAllByRole("link")
    const altLabels = links.map(link => link.textContent)
    expect(altLabels).toEqual(
      expect.arrayContaining([
        "search using a prescription ID",
        "search using an NHS number"
      ])
    )
  })

  it("renders correct navigation and content for NHS number search", () => {
    mockGetAllSearchParameters.mockReturnValue({
      nhsNumber: "9912003071"
    })
    setupRouter({
      nhsNumber: "9912003071"
    })
    const link = screen.getByTestId("go-back-link")
    expect(link.getAttribute("href")).toContain(FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER)

    const querySummary = screen.getByTestId("query-summary")

    // Should offer prescription ID and basic details as alternative links
    const altLinks = within(querySummary).getAllByRole("link").map(l => l.textContent)
    const nhsNumberAltLabels = SEARCH_STRINGS[SEARCH_TYPES.NHS_NUMBER].alternatives.map(a => a.label)
    expect(altLinks).toEqual(expect.arrayContaining(nhsNumberAltLabels))
  })

  it("renders correct navigation and content for Prescription ID search", () => {
    setupRouter({prescriptionId: "9000000001"})
    const link = screen.getByTestId("go-back-link")
    expect(link.getAttribute("href")).toContain(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)

    const querySummary = screen.getByTestId("query-summary")

    // Should offer NHS number and basic details as alternative links
    const altLinks = within(querySummary).getAllByRole("link").map(l => l.textContent)
    const expectedAltLabels = SEARCH_STRINGS[SEARCH_TYPES.BASIC_DETAILS].alternatives.map(a => a.label)
    expect(altLinks).toEqual(expect.arrayContaining(expectedAltLabels))
  })
})
