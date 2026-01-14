import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import React from "react"

import NoPatientsFoundPage from "@/pages/NoPatientsFoundPage"
import {NavigationProvider} from "@/context/NavigationProvider"

// Mock the PatientNotFoundMessage component
jest.mock("@/components/PatientNotFoundMessage", () => {
  return function MockPatientNotFoundMessage() {
    return <div data-testid="patient-not-found-message">Patient not found message</div>
  }
})

// Mock usePageTitle hook
const mockUsePageTitle = jest.fn()
jest.mock("@/hooks/usePageTitle", () => ({
  usePageTitle: mockUsePageTitle
}))

const renderWithRouter = () => {
  return render(
    <MemoryRouter>
      <NavigationProvider>
        <NoPatientsFoundPage />
      </NavigationProvider>
    </MemoryRouter>
  )
}

describe("NoPatientsFoundPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("sets the correct page title", () => {
    renderWithRouter()
    expect(mockUsePageTitle).toHaveBeenCalledWith("Patient not found - Prescription Tracker")
  })

  it("renders the PatientNotFoundMessage component", () => {
    renderWithRouter()
    expect(screen.getByTestId("patient-not-found-message")).toBeInTheDocument()
  })

  it("displays patient not found message text", () => {
    renderWithRouter()
    expect(screen.getByText("Patient not found message")).toBeInTheDocument()
  })
})
