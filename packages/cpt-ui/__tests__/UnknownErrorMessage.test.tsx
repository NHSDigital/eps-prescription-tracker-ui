import React, {Component, ReactNode} from "react"
import {render, screen} from "@testing-library/react"
import {MemoryRouter, Routes, Route} from "react-router-dom"
import UnknownErrorMessage from "@/components/UnknownErrorMessage"
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
const defaultSearchState: SearchProviderContextType = {
  prescriptionId: null,
  issueNumber: undefined,
  firstName: null,
  lastName: null,
  dobDay: null,
  dobMonth: null,
  dobYear: null,
  postcode: null,
  nhsNumber: null,
  clearSearchParameters: mockClearSearchParameters,
  setPrescriptionId: mockSetPrescriptionId,
  setIssueNumber: mockSetIssueNumber,
  setFirstName: mockSetFirstName,
  setLastName: mockSetLastName,
  setDobDay: mockSetDobDay,
  setDobMonth: mockSetDobMonth,
  setDobYear: mockSetDobYear,
  setPostcode: mockSetPostcode,
  setNhsNumber: mockSetNhsNumber
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
  it("renders fallback UI when an unexpected error occurs", () => {
    render(
      <MemoryRouter initialEntries={["/simulate-error"]}>
        <SearchContext.Provider value={defaultSearchState}>
          <TestErrorBoundary>
            <Routes>
              <Route path="/simulate-error" element={<ErrorThrowingComponent />} />
            </Routes>
          </TestErrorBoundary>
        </SearchContext.Provider>
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
