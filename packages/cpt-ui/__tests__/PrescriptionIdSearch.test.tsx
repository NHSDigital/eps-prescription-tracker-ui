import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation
} from "react-router-dom"

import PrescriptionIdSearch from "@/components/prescriptionSearch/PrescriptionIdSearch"
import {PRESCRIPTION_ID_SEARCH_STRINGS} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {AuthContext} from "@/context/AuthProvider"
import {AuthContextType} from "@/context/AuthProvider"
import {JWT} from "aws-amplify/auth"

const LocationDisplay = () => {
  const location = useLocation()
  return <div data-testid="location-display">{location.pathname}</div>
}

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={["/search"]}>
      <AuthContext.Provider value={mockAuthContext}>
        <Routes>
          <Route path="/search" element={ui} />
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

const mockAuthContext: AuthContextType = {
  error: null,
  user: null,
  isSignedIn: true,
  idToken: "mock-id-token" as unknown as JWT,
  accessToken: "mock-access-token" as unknown as JWT,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn()
}

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthContext}>
        {ui}
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe("PrescriptionIdSearch", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("renders the label, hint, and submit button", () => {
    renderWithProviders(<PrescriptionIdSearch />)
    expect(screen.getByTestId("prescription-id-search-heading")).toBeInTheDocument()
    expect(screen.getByTestId("prescription-id-hint")).toBeInTheDocument()
    expect(screen.getByTestId("find-prescription-button")).toHaveTextContent(
      PRESCRIPTION_ID_SEARCH_STRINGS.buttonText
    )
  })

  it("shows error for empty input", async () => {
    renderWithProviders(<PrescriptionIdSearch />)
    await userEvent.click(screen.getByTestId("find-prescription-button"))
    expect(await screen.findByTestId("error-summary")).toBeInTheDocument()
    expect(screen.getAllByText(/Enter a prescription ID number/i).length).toBeGreaterThan(0)
  })

  it("shows error for invalid length", async () => {
    renderWithProviders(<PrescriptionIdSearch />)
    await userEvent.type(screen.getByTestId("prescription-id-input"), "12345")
    await userEvent.click(screen.getByTestId("find-prescription-button"))
    expect(screen.getAllByText(/must contain 18 characters/i).length).toBeGreaterThan(0)
  })

  it("shows error for invalid characters", async () => {
    renderWithProviders(<PrescriptionIdSearch />)

    const invalidChars = "1234567890ABCDEFG!" // 18 characters with illegal `!`
    await userEvent.type(screen.getByTestId("prescription-id-input"), invalidChars)
    await userEvent.click(screen.getByTestId("find-prescription-button"))

    const errorSummary = await screen.findByTestId("error-summary")

    expect(errorSummary).toHaveTextContent(
      "The prescription ID number must contain only letters, numbers, dashes or the + character"
    )
  })

  it("shows noMatch error if ID is in incorrect format (invalid characters)", async () => {
    renderWithProviders(<PrescriptionIdSearch />)

    // This ID contains characters that make the short-form pattern invalid
    await userEvent.type(screen.getByTestId("prescription-id-input"), "H0C757-X83008-C2G93O")
    await userEvent.click(screen.getByTestId("find-prescription-button"))

    const errorSummary = await screen.findByTestId("error-summary")
    expect(errorSummary).toHaveTextContent(
      "The prescription ID number is not recognised"
    )
  })

  it("redirects to prescription results if valid ID is entered", async () => {
    renderWithRouter(<PrescriptionIdSearch />)

    await userEvent.type(screen.getByTestId("prescription-id-input"), "C0C757A83008C2D93O")
    await userEvent.click(screen.getByTestId("find-prescription-button"))

    const location = await screen.findByTestId("location-display")
    expect(location).toHaveTextContent("/prescription-results")
  })
})
