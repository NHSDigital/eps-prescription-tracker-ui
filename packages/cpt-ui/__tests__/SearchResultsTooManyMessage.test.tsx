/* eslint-disable max-len */
import "@testing-library/jest-dom"
import {render, screen, fireEvent} from "@testing-library/react"
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation
} from "react-router-dom"
import React from "react"

import SearchResultsTooManyMessage from "@/components/SearchResultsTooManyMessage"
import {STRINGS} from "@/constants/ui-strings/SearchResultsTooManyStrings"
import {FRONTEND_PATHS} from "@/constants/environment"
import {NavigationProvider} from "@/context/NavigationProvider"

// Mock the navigation context
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

// Dummy component to receive navigation
const DummyPage = ({label}: { label: string }) => <div data-testid="dummy-page">{label}</div>

// useLocation wrapper to pass .search to the component
function TestWrapper() {
  const location = useLocation()
  return <SearchResultsTooManyMessage search={location.search} />
}

function makeQuery(params: Record<string, string>): string {
  return "?" + Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")
}

const renderWithRouter = (
  queryParams: Record<string, string> = {},
  initialPath = "/too-many-search-results"
) => {
  const search = makeQuery(queryParams)
  return render(
    <MemoryRouter initialEntries={[initialPath + search]}>
      <NavigationProvider>
        <Routes>
          <Route path="/too-many-search-results" element={<TestWrapper />} />
          <Route path={FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS} element={<DummyPage label="Basic Details Search" />} />
          <Route path={FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER} element={<DummyPage label="NHS Number Search" />} />
          <Route path={FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID} element={<DummyPage label="Prescription ID Search" />} />
        </Routes>
      </NavigationProvider>
    </MemoryRouter>
  )
}

describe("SearchResultsTooManyMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetBackPath.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)
  })
  it("renders static text content", () => {
    renderWithRouter()
    expect(screen.getByTestId("too-many-results-heading")).toHaveTextContent(STRINGS.HEADING)
    expect(screen.getByTestId("too-many-results-message")).toHaveTextContent(STRINGS.RESULTS_MESSAGE)
    expect(screen.getByTestId("too-many-results-count-text")).toHaveTextContent(STRINGS.RETRY_MESSAGE)
    expect(screen.getByTestId("too-many-results-alt-options")).toHaveTextContent(STRINGS.ALTERNATIVE_SEARCH)
  })

  const navigationLinks = [
    {
      label: STRINGS.BASIC_DETAILS_LINK_TEXT,
      expected: "Basic Details Search"
    },
    {
      label: STRINGS.NHS_NUMBER_LINK_TEXT,
      expected: "NHS Number Search"
    },
    {
      label: STRINGS.PRESCRIPTION_ID_LINK_TEXT,
      expected: "Prescription ID Search"
    }
  ]

  it.each(navigationLinks)(
    "navigates correctly when '$label' link is clicked",
    ({label, expected}) => {
      renderWithRouter()
      fireEvent.click(screen.getByText(label))
      expect(screen.getByTestId("dummy-page")).toHaveTextContent(expected)
    }
  )

  it("navigates to the basic details search when the go back link is clicked", () => {
    renderWithRouter()
    const backLink = screen.getByTestId("go-back-link")
    expect(backLink.getAttribute("href")).toContain(
      FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS
    )
    fireEvent.click(backLink)
    expect(mockGoBack).toHaveBeenCalled()
  })
})
