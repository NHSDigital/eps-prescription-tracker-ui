import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import React from "react"

import SearchForAPrescription from "@/pages/SearchPrescriptionPage"
import {HERO_TEXT} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {AuthContext} from "@/context/AuthProvider"
import {AccessContext, AccessContextType} from "@/context/AccessProvider"

// Default mock values for contexts
const defaultAuthContext = {
  error: null,
  user: null,
  isSignedIn: false,
  idToken: null,
  accessToken: null,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn()
}

const defaultAccessContext: AccessContextType = {
  noAccess: false,
  singleAccess: false,
  selectedRole: undefined,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  loading: false,
  error: null,
  setNoAccess: jest.fn(),
  setSingleAccess: jest.fn(),
  updateSelectedRole: jest.fn(),
  userDetails: undefined,
  setUserDetails: jest.fn(),
  clear: jest.fn()
}

// Utility function to render with all required providers
const renderWithProviders = (
  ui: React.ReactElement,
  {
    authContext = defaultAuthContext,
    accessContext = defaultAccessContext
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
