import React, {Component, ReactNode} from "react"
import {render, screen} from "@testing-library/react"
import {MemoryRouter, Routes, Route} from "react-router-dom"
import UnknownErrorMessage from "@/components/UnknownErrorMessage"
import {FRONTEND_PATHS} from "@/constants/environment"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"
import {NavigationProvider} from "@/context/NavigationProvider"

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

const mockClearSearchParameters = jest.fn()
const mockSetPrescriptionId = jest.fn()
const mockSetIssueNumber = jest.fn()
const mockSetFirstName = jest.fn()
const mockSetLastName = jest.fn()
const mockSetDobDay = jest.fn()
const mockSetDobMonth = jest.fn()
const mockSetDobYear = jest.fn()
const mockSetPostcode = jest.fn()
const mockSetNhsNumber = jest.fn()
const mockGetAllSearchParameters = jest.fn()
const mockSetAllSearchParameters = jest.fn()
const mockSetSearchType = jest.fn()

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
  searchType: undefined,
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
  setAllSearchParameters: mockSetAllSearchParameters,
  setSearchType: mockSetSearchType
}

// A simple error boundary for testing purposes
class TestErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: {children: ReactNode}) {
    super(props)
    this.state = {hasError: false}
  }

  static getDerivedStateFromError() {
    return {hasError: true}
  }

  render() {
    if (this.state.hasError) {
      return <UnknownErrorMessage />
    }

    return this.props.children
  }
}

// Simulate a component that crashes
function ErrorThrowingComponent(): React.ReactElement {
  throw new Error("Simulated JS error for testing fallback")
}

describe("UnknownErrorMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetBackPath.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)
  })

  it("renders fallback UI when an unexpected error occurs", () => {
    render(
      <MemoryRouter initialEntries={["/simulate-error"]}>
        <NavigationProvider>
          <SearchContext.Provider value={defaultSearchState}>
            <TestErrorBoundary>
              <Routes>
                <Route path="/simulate-error" element={<ErrorThrowingComponent />} />
              </Routes>
            </TestErrorBoundary>
          </SearchContext.Provider>
        </NavigationProvider>
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", {level: 1})).toHaveTextContent(
      "Sorry, there is a problem with this service"
    )

    expect(screen.getByText("Try again later.")).toBeInTheDocument()

    expect(screen.getByTestId("go-back-link")).toHaveAttribute(
      "href",
      FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS
    )
  })
})
