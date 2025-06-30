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
import {FRONTEND_PATHS} from "@/constants/environment"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom")
  return {
    ...actual,
    useLocation: actual.useLocation,
    useNavigate: jest.fn()
  }
})

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
const mockGetAllSearchParameters = jest.fn()
const mockSetAllSearchParameters = jest.fn()
const defaultSearchState: SearchProviderContextType = {
  prescriptionId: undefined,
  issueNumber: undefined,
  firstName: undefined,
  lastName: undefined,
  dobDay: undefined,
  dobMonth: undefined,
  dobYear: undefined,
  postcode: undefined,
  nhsNumber: undefined,
  clearSearchParameters: mockClearSearchParameters,
  setPrescriptionId: mockSetPrescriptionId,
  setIssueNumber: mockSetIssueNumber,
  setFirstName: mockSetFirstName,
  setLastName: mockSetLastName,
  setDobDay: mockSetDobDay,
  setDobMonth: mockSetDobMonth,
  setDobYear: mockSetDobYear,
  setPostcode: mockSetPostcode,
  setNhsNumber: mockSetNhsNumber,
  getAllSearchParameters: mockGetAllSearchParameters,
  setAllSearchParameters: mockSetAllSearchParameters
}

const LocationDisplay = () => {
  const location = useLocation()
  return <div data-testid="location-display">{location.pathname + location.search}</div>
}

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <SearchContext.Provider value={defaultSearchState}>
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/search" element={ui} />
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    </SearchContext.Provider>
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
    await userEvent.type(screen.getByTestId("nhs-number-input"), "9233739112")
    await userEvent.click(screen.getByTestId("find-patient-button"))

    expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)
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

    expect(screen.getAllByText("Enter an NHS number").length).toBeGreaterThan(1)
  })

  it("shows error for letters in input (abc)", async () => {
    renderWithRouter(<NhsNumSearch />)
    await userEvent.type(screen.getByTestId("nhs-number-input"), "abc")
    await userEvent.click(screen.getByTestId("find-patient-button"))

    expect(screen.getAllByText("NHS number must have 10 digits").length).toBeGreaterThan(1)
  })

  it("shows error for short input (123)", async () => {
    renderWithRouter(<NhsNumSearch />)
    await userEvent.type(screen.getByTestId("nhs-number-input"), "123")
    await userEvent.click(screen.getByTestId("find-patient-button"))

    expect(screen.getAllByText("NHS number must have 10 digits").length).toBeGreaterThan(1)
  })

  it("shows error for too long input", async () => {
    renderWithRouter(<NhsNumSearch />)
    await userEvent.type(screen.getByTestId("nhs-number-input"), "1234567890000")
    await userEvent.click(screen.getByTestId("find-patient-button"))

    expect(screen.getAllByText("NHS number must have 10 digits").length).toBeGreaterThan(1)
  })

  it("shows error for 10-digit input with invalid checksum", async () => {
    renderWithRouter(<NhsNumSearch />)
    await userEvent.type(screen.getByTestId("nhs-number-input"), "1234567890")
    await userEvent.click(screen.getByTestId("find-patient-button"))

    expect(
      screen.getAllByText("NHS number does not match a patient, enter another NHS number").length
    ).toBeGreaterThan(1)
  })

  it("shows format error for 10-character alphanumeric input", async () => {
    renderWithRouter(<NhsNumSearch />)
    await userEvent.type(screen.getByTestId("nhs-number-input"), "12345abcde")
    await userEvent.click(screen.getByTestId("find-patient-button"))

    expect(
      screen.getAllByText("Enter an NHS number in the correct format").length
    ).toBeGreaterThan(1)
  })

  it("accepts spaced valid NHS number", async () => {
    const mockNavigate = jest.fn()
    ;(useNavigate as jest.Mock).mockReturnValue(mockNavigate)

    renderWithRouter(<NhsNumSearch />)
    await userEvent.type(screen.getByTestId("nhs-number-input"), "923 373 9112")
    await userEvent.click(screen.getByTestId("find-patient-button"))

    expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT )
  })
})
