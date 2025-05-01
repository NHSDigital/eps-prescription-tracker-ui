import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import {
  MemoryRouter,
  useLocation,
  useNavigate,
  Routes,
  Route
} from "react-router-dom"

import NhsNumSearch from "@/components/prescriptionSearch/NhsNumSearch"
import {STRINGS} from "@/constants/ui-strings/NhsNumSearchStrings"
import {SEARCH_TYPES} from "@/constants/ui-strings/PrescriptionNotFoundPageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom")
  return {
    ...actual,
    useLocation: actual.useLocation,
    useNavigate: jest.fn()
  }
})

const LocationDisplay = () => {
  const location = useLocation()
  return <div data-testid="location-display">{location.pathname + location.search}</div>
}

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={["/search"]}>
      <Routes>
        <Route path="/search" element={ui} />
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("NhsNumSearch", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("redirects to prescription list if valid NHS number", async () => {
    const mockNavigate = jest.fn()
      ; (useNavigate as jest.Mock).mockReturnValue(mockNavigate)

    renderWithRouter(<NhsNumSearch />)
    await userEvent.type(screen.getByTestId("nhs-number-input"), "1234567890")
    await userEvent.click(screen.getByTestId("find-patient-button"))

    expect(mockNavigate).toHaveBeenCalledWith(
      `${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?nhsNumber=1234567890`
    )
  })

  it("redirects to not found for any non-matching NHS number", async () => {
    const mockNavigate = jest.fn()
      ; (useNavigate as jest.Mock).mockReturnValue(mockNavigate)

    renderWithRouter(<NhsNumSearch />)
    await userEvent.type(screen.getByTestId("nhs-number-input"), "0987654321")
    await userEvent.click(screen.getByTestId("find-patient-button"))

    expect(mockNavigate).toHaveBeenCalledWith(
      `${FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND}?searchType=${SEARCH_TYPES.NHS_NUMBER}`
    )
  })

  it("renders label, hint, and submit button", () => {
    renderWithRouter(<NhsNumSearch />)
    expect(screen.getByText(STRINGS.labelText)).toBeInTheDocument()
    expect(screen.getByText(STRINGS.hintText)).toBeInTheDocument()
    expect(screen.getByTestId("find-patient-button")).toBeInTheDocument()
  })

  it("shows error for empty input", async () => {
    renderWithRouter(<NhsNumSearch />)
    await userEvent.click(screen.getByTestId("find-patient-button"))

    const allMatches = screen.getAllByText("Enter an NHS number")
    expect(allMatches.length).toBeGreaterThan(1) // Expect in summary + message
  })

  it("shows errors for letters in input (abc)", async () => {
    renderWithRouter(<NhsNumSearch />)
    await userEvent.type(screen.getByTestId("nhs-number-input"), "abc")
    await userEvent.click(screen.getByTestId("find-patient-button"))

    expect(screen.getByText("NHS number must have 10 numbers")).toBeInTheDocument()
    expect(
      screen.getAllByText("Enter an NHS number in the correct format").length
    ).toBeGreaterThan(1)
  })

  it("shows error for short input (123)", async () => {
    renderWithRouter(<NhsNumSearch />)
    await userEvent.type(screen.getByTestId("nhs-number-input"), "123")
    await userEvent.click(screen.getByTestId("find-patient-button"))

    expect(screen.getAllByText("NHS number must have 10 numbers").length).toBeGreaterThan(1)
    expect(
      screen.queryByText("Enter an NHS number in the correct format")
    ).not.toBeInTheDocument()
  })

  it("shows error for too long input", async () => {
    renderWithRouter(<NhsNumSearch />)
    await userEvent.type(screen.getByTestId("nhs-number-input"), "1234567890000")
    await userEvent.click(screen.getByTestId("find-patient-button"))

    expect(screen.getAllByText("NHS number must have 10 numbers").length).toBeGreaterThan(1)
    expect(
      screen.queryByText("Enter an NHS number in the correct format")
    ).not.toBeInTheDocument()
  })
})
