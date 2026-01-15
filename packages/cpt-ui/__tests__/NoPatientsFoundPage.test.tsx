import "@testing-library/jest-dom"
import React from "react"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"

import {NavigationProvider} from "@/context/NavigationProvider"

jest.mock("@/hooks/usePageTitle", () => ({
  usePageTitle: jest.fn()
}))

jest.mock("@/components/PatientNotFoundMessage", () => {
  return function MockPatientNotFoundMessage() {
    return <div data-testid="patient-not-found-message">Patient not found message</div>
  }
})

import NoPatientsFoundPage from "@/pages/NoPatientsFoundPage"
import {usePageTitle} from "@/hooks/usePageTitle"

const mockUsePageTitle = usePageTitle as jest.MockedFunction<typeof usePageTitle>

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
