import "@testing-library/jest-dom"
import React from "react"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"

import {NavigationProvider} from "@/context/NavigationProvider"

jest.mock("@/hooks/usePageTitle", () => ({
  usePageTitle: jest.fn()
}))

jest.mock("@/components/PrescriptionNotFoundMessage", () => {
  return function MockPrescriptionNotFoundMessage() {
    return <div data-testid="prescription-not-found-message">Prescription not found message</div>
  }
})

jest.mock("@/constants/ui-strings/PrescriptionNotFoundMessageStrings", () => ({
  STRINGS: {
    heading: "Prescriptions not found"
  }
}))

import NoPrescriptionsFoundPage from "@/pages/NoPrescriptionsFoundPage"
import {usePageTitle} from "@/hooks/usePageTitle"

const mockUsePageTitle = usePageTitle as jest.MockedFunction<typeof usePageTitle>

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
    expect(mockUsePageTitle).toHaveBeenCalledWith("Prescriptions not found - Prescription Tracker")
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
