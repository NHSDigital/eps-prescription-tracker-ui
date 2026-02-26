
import "@testing-library/jest-dom"
import {render, screen, fireEvent} from "@testing-library/react"
import {MemoryRouter, Routes, Route} from "react-router-dom"
import React from "react"

import PatientNotFoundMessage from "@/components/PatientNotFoundMessage"
import {STRINGS} from "@/constants/ui-strings/PatientNotFoundMessageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"
import {NavigationProvider} from "@/context/NavigationProvider"
import {SearchProvider} from "@/context/SearchProvider"
import SearchPrescriptionPage from "@/pages/SearchPrescriptionPage"
import {PRESCRIPTION_ID_SEARCH_TAB_TITLE, NHS_NUMBER_SEARCH_TAB_TITLE} from "@/constants/ui-strings/SearchTabStrings"

const mockGetBackPath = jest.fn()
const mockGoBack = jest.fn()
const mockNavigationContext = {
  pushNavigation: jest.fn(),
  goBack: mockGoBack,
  getBackPath: mockGetBackPath,
  clearNavigation: jest.fn(),
  getCurrentEntry: jest.fn(),
  getNavigationStack: jest.fn(),
  canGoBack: jest.fn(),
  setOriginalSearchPage: jest.fn(),
  getOriginalSearchPage: jest.fn(),
  captureOriginalSearchParameters: jest.fn(),
  getOriginalSearchParameters: jest.fn(),
  getRelevantSearchParameters: jest.fn(),
  startNewNavigationSession: jest.fn()
}

jest.mock("@/context/NavigationProvider", () => ({
  ...jest.requireActual("@/context/NavigationProvider"),
  useNavigationContext: () => mockNavigationContext
}))

function setupRouter(
  search = "?firstName=Zoe&lastName=Zero&dobDay=31&dobMonth=12&dobYear=2021&postcode=AB1%202CD"
) {
  render(
    <MemoryRouter initialEntries={["/not-found" + search]}>
      <NavigationProvider>
        <SearchProvider>
          <Routes>
            <Route path="/not-found" element={<PatientNotFoundMessage />} />
            <Route path={FRONTEND_PATHS.SEARCH} element={<SearchPrescriptionPage />} />
          </Routes>
        </SearchProvider>
      </NavigationProvider>
    </MemoryRouter>
  )
}

describe("PatientNotFoundMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the main heading and static content", () => {
    setupRouter()
    expect(screen.getByTestId("patient-not-found-heading")).toHaveTextContent(STRINGS.heading)
    expect(screen.getByTestId("query-summary")).toHaveTextContent(STRINGS.retryMessage)
    expect(screen.getByTestId("query-summary")).toHaveTextContent(STRINGS.intro)
    expect(screen.getByTestId("query-summary")).toHaveTextContent(STRINGS.alternativeSearch)
  })

  it("renders the go-back link with search query, and navigates to Basic Details Search", () => {
    const search = "?firstName=Zoe&lastName=Zero&dobDay=31&dobMonth=12&dobYear=2021&postcode=AB1%202CD"
    mockGetBackPath.mockReturnValue(
      FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS + search
    )

    setupRouter(search)
    const backLink = screen.getByTestId("go-back-link")
    expect(backLink).toHaveAttribute(
      "href",
      FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS + search
    )
    fireEvent.click(backLink)
    expect(mockGoBack).toHaveBeenCalled()
  })

  it("navigates to NHS Number Search when alternate link is clicked", () => {
    mockGetBackPath.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)

    setupRouter()
    const nhsNumberLink = screen.getByTestId("patient-not-found-nhs-number-link")
    expect(nhsNumberLink).toHaveAttribute("href", FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER)
    fireEvent.click(nhsNumberLink)
    expect(screen.getByTestId("tab-active")).toHaveTextContent(NHS_NUMBER_SEARCH_TAB_TITLE)
  })

  it("navigates to Prescription ID Search when alternate link is clicked", () => {
    mockGetBackPath.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)

    setupRouter()
    const prescriptionIdLink = screen.getByTestId("patient-not-found-prescription-id-link")
    expect(prescriptionIdLink).toHaveAttribute("href", FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
    fireEvent.click(prescriptionIdLink)
    expect(screen.getByTestId("tab-active")).toHaveTextContent(PRESCRIPTION_ID_SEARCH_TAB_TITLE)
  })

  it("renders correctly even with empty or no search parameter", () => {
    mockGetBackPath.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)

    setupRouter("") // Empty search
    const backLink = screen.getByTestId("go-back-link")
    expect(backLink).toHaveAttribute("href", FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)
    fireEvent.click(backLink)
    expect(mockGoBack).toHaveBeenCalled()
  })
})
