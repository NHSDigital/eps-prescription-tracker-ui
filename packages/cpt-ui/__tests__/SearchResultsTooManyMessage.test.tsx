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

// Dummy component to receive navigation
const DummyPage = ({label}: {label: string}) => <div data-testid="dummy-page">{label}</div>

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
  initialPath = "/search-too-many"
) => {
  const search = makeQuery(queryParams)
  return render(
    <MemoryRouter initialEntries={[initialPath + search]}>
      <Routes>
        <Route path="/search-too-many" element={<TestWrapper />} />
        <Route path={FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS} element={<DummyPage label="Basic Details Search" />} />
        <Route path={FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER} element={<DummyPage label="NHS Number Search" />} />
        <Route path={FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID} element={<DummyPage label="Prescription ID Search" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("SearchResultsTooManyMessage", () => {
  it("renders static text content and patient details", () => {
    renderWithRouter({
      firstName: "Jane",
      lastName: "Doe",
      dobDay: "01",
      dobMonth: "01",
      dobYear: "2000",
      postcode: "XY9 8ZZ"
    })

    expect(screen.getByTestId("too-many-results-heading")).toHaveTextContent(STRINGS.heading)
    expect(screen.getByTestId("too-many-results-count-text")).toHaveTextContent(STRINGS.retryMessage)

    const details = screen.getByTestId("too-many-results-details-list")
    expect(details).toHaveTextContent("First name: Jane")
    expect(details).toHaveTextContent("Last name: Doe")
    expect(details).toHaveTextContent("Date of birth: 01-Jan-2000")
    expect(details).toHaveTextContent("Postcode: XY9 8ZZ")
  })

  const navigationLinks = [
    {
      label: STRINGS.basicDetailsLinkText,
      expected: "Basic Details Search"
    },
    {
      label: STRINGS.nhsNumberLinkText,
      expected: "NHS Number Search"
    },
    {
      label: STRINGS.prescriptionIdLinkText,
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
    fireEvent.click(screen.getByTestId("too-many-results-back-link"))
    expect(screen.getByTestId("dummy-page")).toHaveTextContent("Basic Details Search")
  })
})
