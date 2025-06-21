import React, {Component, ReactNode} from "react"
import {render, screen} from "@testing-library/react"
import {MemoryRouter, Routes, Route} from "react-router-dom"
import UnknownErrorMessage from "@/components/UnknownErrorMessage"
import {FRONTEND_PATHS} from "@/constants/environment"

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
        <TestErrorBoundary>
          <Routes>
            <Route path="/simulate-error" element={<ErrorThrowingComponent />} />
          </Routes>
        </TestErrorBoundary>
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
