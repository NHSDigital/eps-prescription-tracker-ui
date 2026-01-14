import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import React from "react"

import NoPrescriptionsFoundPage from "@/pages/NoPrescriptionsFoundPage"
import {NavigationProvider} from "@/context/NavigationProvider"
import {STRINGS} from "@/constants/ui-strings/PrescriptionNotFoundMessageStrings"

// Mock the PrescriptionNotFoundMessage component
jest.mock("@/components/PrescriptionNotFoundMessage", () => {
  return function MockPrescriptionNotFoundMessage() {
    return <div data-testid="prescription-not-found-message">Prescription not found message</div>
  }
})

// Mock usePageTitle hook
const mockUsePageTitle = jest.fn()
jest.mock("@/hooks/usePageTitle", () => ({
  usePageTitle: mockUsePageTitle
}))

// Mock the strings to avoid import errors
jest.mock("@/constants/ui-strings/PrescriptionNotFoundMessageStrings", () => ({
  STRINGS: {
    heading: "Prescriptions not found"
  }
}))

const renderWithRouter = () => {
  return render(
    <MemoryRouter>
      <NavigationProvider>
        <NoPrescriptionsFoundPage />
      </NavigationProvider>
    </MemoryRouter>
  )
}

describe("NoPrescriptionsFoundPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("sets the correct page title using strings from PrescriptionNotFoundMessageStrings", () => {
    renderWithRouter()
    expect(mockUsePageTitle).toHaveBeenCalledWith(`${STRINGS.heading} - Prescription Tracker`)
  })

  it("renders the PrescriptionNotFoundMessage component", () => {
    renderWithRouter()
    expect(screen.getByTestId("prescription-not-found-message")).toBeInTheDocument()
  })

  it("displays prescription not found message text", () => {
    renderWithRouter()
    expect(screen.getByText("Prescription not found message")).toBeInTheDocument()
  })
})
