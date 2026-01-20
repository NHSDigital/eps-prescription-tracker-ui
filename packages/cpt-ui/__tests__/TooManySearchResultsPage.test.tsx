import React from "react"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import TooManySearchResultsPage from "@/pages/TooManySearchResultsPage"
import {NavigationProvider} from "@/context/NavigationProvider"

// Mock the SearchResultsTooManyMessage component
jest.mock("@/components/SearchResultsTooManyMessage", () => {
  return function MockSearchResultsTooManyMessage(props: { search?: string }) {
    return (
      <div data-testid="search-results-too-many-message">
        Search parameter: {props.search || ""}
      </div>
    )
  }
})

// Mock the navigation context
const mockNavigationContext = {
  pushNavigation: jest.fn(),
  goBack: jest.fn(),
  getBackPath: jest.fn(),
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

function renderWithRouter(initialPath = "/too-many-search-results") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NavigationProvider>
        <TooManySearchResultsPage />
      </NavigationProvider>
    </MemoryRouter>
  )
}

describe("TooManySearchResultsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the SearchResultsTooManyMessage component", () => {
    renderWithRouter()
    expect(screen.getByTestId("search-results-too-many-message")).toBeInTheDocument()
  })

  it("passes the search query parameters to the component", () => {
    renderWithRouter("/too-many-search-results?firstName=John&lastName=Smith")
    expect(screen.getByTestId("search-results-too-many-message")).toHaveTextContent(
      "Search parameter: ?firstName=John&lastName=Smith"
    )
  })

  it("handles empty search parameters", () => {
    renderWithRouter("/too-many-search-results")
    expect(screen.getByTestId("search-results-too-many-message")).toHaveTextContent(
      "Search parameter:"
    )
  })
})
