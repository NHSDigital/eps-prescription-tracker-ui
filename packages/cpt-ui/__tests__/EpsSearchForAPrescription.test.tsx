import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import React from "react"

import SearchForAPrescription from "@/pages/SearchPrescriptionPage"
import {HERO_TEXT} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {AuthContext, AuthContextType} from "@/context/AuthProvider"
import {AccessContext} from "@/context/AccessProvider"

// Default mock values for contexts
const defaultAuthContext: AuthContextType = {
  error: null,
  user: null,
  isSignedIn: false,
  isSigningIn: false,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  hasNoAccess: false,
  hasSingleRoleAccess: false,
  selectedRole: undefined,
  userDetails: undefined,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn()
}

// Utility function to render with all required providers
const renderWithProviders = (
  ui: React.ReactElement,
  {
    authContext = defaultAuthContext,
    accessContext = null
  } = {}
) => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authContext}>
        <AccessContext.Provider value={accessContext}>
          {ui}
        </AccessContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

jest.mock("@/components/EpsTabs", () => {
  return {
    __esModule: true,
    default: () => <div data-testid="eps-tabs">Mocked EpsTabs</div>
  }
})

describe("SearchForAPrescription", () => {
  it("renders the hero banner", () => {
    renderWithProviders(<SearchForAPrescription />)
    const heroBanner = screen.getByRole("heading", {name: /Search for a prescription/i})
    expect(heroBanner).toBeInTheDocument()
  })

  it(`contains the text '${HERO_TEXT}'`, () => {
    renderWithProviders(<SearchForAPrescription />)
    const heroHeading = screen.getByRole("heading", {name: /Search for a prescription/i})
    expect(heroHeading).toHaveTextContent(HERO_TEXT)
  })
})
