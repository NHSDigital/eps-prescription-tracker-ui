import React, {Component} from "react"
import {render, fireEvent} from "@testing-library/react"
import ErrorBoundary from "@/context/ErrorBoundary" // Adjust import path as needed
import {AwsRum} from "aws-rum-web"
import {AwsRumContext} from "@/context/AwsRumProvider" // Adjust import path as needed

// Mock component that throws an error
class ErrorThrowingComponent extends Component {
  componentDidMount() {
    throw new Error("Test Error")
  }

  render() {
    return <div>Error Throwing Component</div>
  }
}

// Mock component that renders normally
const NormalComponent = () => <div>Normal Component</div>

describe("ErrorBoundary", () => {
  // Mock console.error to prevent actual error logging
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

  // Create a mock AwsRum instance
  const mockAwsRum = {
    recordError: jest.fn()
  } as unknown as AwsRum

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  afterAll(() => {
    // Restore console.error
    consoleErrorSpy.mockRestore()
  })

  test("renders children component when no error occurs", () => {
    const {getByText} = render(
      <AwsRumContext.Provider value={null}>
        <ErrorBoundary>
          <NormalComponent />
        </ErrorBoundary>
      </AwsRumContext.Provider>
    )

    expect(getByText("Normal Component")).toBeInTheDocument()
  })

  test("renders error UI when a child component throws an error", () => {
    const {getByText} = render(
      <AwsRumContext.Provider value={null}>
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      </AwsRumContext.Provider>
    )

    expect(getByText("Something went wrong.")).toBeInTheDocument()
    expect(getByText("Clear Error")).toBeInTheDocument()
  })

  test("records error with AwsRum when available", () => {
    const error = new Error("Test Error")

    // Spy on the error being recorded
    const recordErrorSpy = jest.spyOn(mockAwsRum, "recordError")

    render(
      <AwsRumContext.Provider value={mockAwsRum}>
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      </AwsRumContext.Provider>
    )

    // Verify error was recorded with AwsRum
    expect(recordErrorSpy).toHaveBeenCalledWith(error)
  })

  test("does not attempt to record error when AwsRum is not available", () => {
    render(
      <AwsRumContext.Provider value={null}>
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      </AwsRumContext.Provider>
    )

    // Verify no error recording attempt when AwsRum is null
    expect(mockAwsRum.recordError).not.toHaveBeenCalled()
  })

  test("clears error and redirects to home page when Clear Error button is clicked", () => {
    // Mock window.location.href
    const originalLocation = window.location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = {href: ""}

    const {getByText} = render(
      <AwsRumContext.Provider value={null}>
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      </AwsRumContext.Provider>
    )

    // Click the Clear Error button
    const clearErrorButton = getByText("Clear Error")
    fireEvent.click(clearErrorButton)

    // Verify redirection to home page
    expect(window.location.href).toBe("/");

    // Restore window.location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = originalLocation
  })

  test("logs error to console", () => {
    const error = new Error("Test Error")

    render(
      <AwsRumContext.Provider value={null}>
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      </AwsRumContext.Provider>
    )

    // Verify error was logged to console
    expect(consoleErrorSpy).toHaveBeenCalledWith("recordingError:", error)
  })
})
