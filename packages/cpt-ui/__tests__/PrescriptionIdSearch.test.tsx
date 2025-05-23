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

import {FRONTEND_PATHS} from "@/constants/environment"
import PrescriptionIdSearch from "@/components/prescriptionSearch/PrescriptionIdSearch"
import {PRESCRIPTION_ID_SEARCH_STRINGS} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {AuthContext, AuthContextType} from "@/context/AuthProvider"
import {JWT} from "aws-amplify/auth"

const mockAuthContext: AuthContextType = {
  error: null,
  user: null,
  isSignedIn: true,
  idToken: "mock-id-token" as unknown as JWT,
  accessToken: "mock-access-token" as unknown as JWT,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn()
}

const LocationDisplay = () => {
  const location = useLocation()
  return <div data-testid="location-display">{location.pathname + location.search}</div>
}

const renderWithRouter = () =>
  render(
    <MemoryRouter initialEntries={["/search"]}>
      <AuthContext.Provider value={mockAuthContext}>
        <Routes>
          <Route path="/search" element={<PrescriptionIdSearch />} />
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )

const setup = async (input: string) => {
  renderWithRouter()
  const inputEl = screen.getByTestId("prescription-id-input")
  if (input.length > 0) {
    await userEvent.type(inputEl, input)
  }
  await userEvent.click(screen.getByTestId("find-prescription-button"))
}

describe("PrescriptionIdSearch", () => {
  beforeEach(() => jest.resetAllMocks())

  it("renders label, hint, and button", () => {
    renderWithRouter()
    expect(screen.getByTestId("prescription-id-search-heading")).toBeInTheDocument()
    expect(screen.getByTestId("prescription-id-hint")).toBeInTheDocument()
    expect(screen.getByTestId("find-prescription-button")).toHaveTextContent(
      PRESCRIPTION_ID_SEARCH_STRINGS.buttonText
    )
  })

  it("redirects to prescription results if valid ID is entered", async () => {
    await setup("c0c757a83008c2d93o")
    const location = await screen.findByTestId("location-display")
    expect(location).toHaveTextContent(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)
  })

  describe.each([
    ["empty input", "", PRESCRIPTION_ID_SEARCH_STRINGS.errors.empty],
    ["invalid characters only", "12345678901234567!", PRESCRIPTION_ID_SEARCH_STRINGS.errors.chars],
    ["invalid length only", "12345678901234567", PRESCRIPTION_ID_SEARCH_STRINGS.errors.length],
    ["invalid length + invalid characters", "12345678901234!@#", PRESCRIPTION_ID_SEARCH_STRINGS.errors.combined],
    ["invalid length + invalid characters", "12345678901234567890!", PRESCRIPTION_ID_SEARCH_STRINGS.errors.combined],
    ["invalid format (not matching short-form)", "H0C757X83008C2G93O", PRESCRIPTION_ID_SEARCH_STRINGS.errors.noMatch],
    ["checksum failure", "C0C757A83008C2D93X", PRESCRIPTION_ID_SEARCH_STRINGS.errors.noMatch]
  ])("validation error: %s", (_desc, input, expectedError) => {
    it(`shows "${expectedError}"`, async () => {
      await setup(input)
      const errorLink = screen.getByRole("link", {name: expectedError})
      expect(errorLink).toBeInTheDocument()

      const errorMessages = screen.getAllByText(expectedError)
      expect(errorMessages).toHaveLength(2) // Summary + inline
    })
  })
})
