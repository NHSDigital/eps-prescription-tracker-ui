
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
import {SearchProvider} from "@/context/SearchProvider"
import SearchPrescriptionPage from "@/pages/SearchPrescriptionPage"
import {PRESCRIPTION_ID_SEARCH_STRINGS} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {STRINGS as BASIC_SEARCH_STRINGS} from "@/constants/ui-strings/BasicDetailsSearchStrings"
import {STRINGS as NHS_NUMBER_SEARCH_STRINGS} from "@/constants/ui-strings/NhsNumSearchStrings"
import {
  PRESCRIPTION_ID_SEARCH_TAB_TITLE,
  NHS_NUMBER_SEARCH_TAB_TITLE,
  BASIC_DETAILS_SEARCH_TAB_TITLE
} from "@/constants/ui-strings/SearchTabStrings"

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

// useLocation wrapper to pass .search to the component
function TestWrapper() {
  const location = useLocation()
  return <SearchResultsTooManyMessage search={location.search} />
}

function makeQuery(params: Record<string, string>): string {
  const entries = Object.entries(params)
  if (entries.length === 0) return ""
  return "?" + entries
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
        <SearchProvider>
          <Routes>
            <Route path="/too-many-search-results" element={<TestWrapper />} />
            <Route path="/search" element={<SearchPrescriptionPage />} />
          </Routes>
        </SearchProvider>

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
      tabTitle: BASIC_DETAILS_SEARCH_TAB_TITLE,
      expectedSubHeader: BASIC_SEARCH_STRINGS.HEADING
    },
    {
      label: STRINGS.NHS_NUMBER_LINK_TEXT,
      tabTitle: NHS_NUMBER_SEARCH_TAB_TITLE,
      expectedSubHeader: NHS_NUMBER_SEARCH_STRINGS.labelText
    },
    {
      label: STRINGS.PRESCRIPTION_ID_LINK_TEXT,
      tabTitle: PRESCRIPTION_ID_SEARCH_TAB_TITLE,
      expectedSubHeader: PRESCRIPTION_ID_SEARCH_STRINGS.labelText
    }
  ]

  it.each(navigationLinks)(
    "navigates correctly when '$label' link is clicked",
    ({label, tabTitle, expectedSubHeader}) => {
      renderWithRouter()
      fireEvent.click(screen.getByText(label))
      expect(screen.getByTestId("tab-active")).toHaveTextContent(tabTitle)
      expect(screen.getByTestId(
        // eg basic-details-search-heading for testid name, dynamically created based on which heading used
        tabTitle.replaceAll(" ", "-").toLowerCase() + "-heading")
      ).toHaveTextContent(expectedSubHeader)
    }
  )

  it("navigates to the basic details search when the go back link is clicked", async () => {
    renderWithRouter()
    const backLink = screen.getByTestId("go-back-link")
    expect(backLink.getAttribute("href")).toContain(
      FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS
    )
    fireEvent.click(backLink)
    expect(mockGoBack).toHaveBeenCalled()
  })
})
