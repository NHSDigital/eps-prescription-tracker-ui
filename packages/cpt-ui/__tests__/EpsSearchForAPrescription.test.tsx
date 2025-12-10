import "@testing-library/jest-dom"
import {render} from "@testing-library/react"
import {screen} from "@testing-library/dom"
import {MemoryRouter} from "react-router-dom"
import React from "react"

import SearchForAPrescription from "@/pages/SearchPrescriptionPage"
import {HERO_TEXT} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {AuthContext, AuthContextType} from "@/context/AuthProvider"
import {AccessContext} from "@/context/AccessProvider"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"
import {NavigationProvider} from "@/context/NavigationProvider"

// Mock the NavigationProvider's useNavigationContext hook
const mockNavigationContext = {
  pushNavigation: jest.fn(),
  goBack: jest.fn(),
  getBackPath: jest.fn(),
  setOriginalSearchPage: jest.fn(),
  captureOriginalSearchParameters: jest.fn(),
  getOriginalSearchParameters: jest.fn(),
  getRelevantSearchParameters: jest.fn(),
  startNewNavigationSession: jest.fn()
}

jest.mock("@/context/NavigationProvider", () => ({
  ...jest.requireActual("@/context/NavigationProvider"),
  useNavigationContext: () => mockNavigationContext
}))

// Default mock values for contexts
const defaultAuthContext: AuthContextType = {
  error: null,
  user: null,
  isSignedIn: false,
  isSigningIn: false,
  invalidSessionCause: undefined,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  hasNoAccess: false,
  hasSingleRoleAccess: false,
  selectedRole: undefined,
  userDetails: undefined,
  isConcurrentSession: false,
  sessionId: undefined,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  updateSelectedRole: jest.fn(),
  updateTrackerUserInfo: jest.fn(),
  updateInvalidSessionCause: jest.fn(),
  isSigningOut: false,
  setIsSigningOut: jest.fn()
}

// Default mock values for SearchProvider
const defaultSearchContext: SearchProviderContextType = {
  prescriptionId: undefined,
  issueNumber: undefined,
  firstName: undefined,
  lastName: undefined,
  dobDay: undefined,
  dobMonth: undefined,
  dobYear: undefined,
  postcode: undefined,
  nhsNumber: undefined,
  searchType: undefined,
  clearSearchParameters: jest.fn(),
  setPrescriptionId: jest.fn(),
  setIssueNumber: jest.fn(),
  setFirstName: jest.fn(),
  setLastName: jest.fn(),
  setDobDay: jest.fn(),
  setDobMonth: jest.fn(),
  setDobYear: jest.fn(),
  setPostcode: jest.fn(),
  setNhsNumber: jest.fn(),
  getAllSearchParameters: jest.fn(),
  setAllSearchParameters: jest.fn(),
  setSearchType: jest.fn()
}

// Utility function to render with all required providers
const renderWithProviders = (
  ui: React.ReactElement,
  {
    authContext = defaultAuthContext,
    accessContext = null,
    searchContext = defaultSearchContext
  } = {}
) => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authContext}>
        <AccessContext.Provider value={accessContext}>
          <SearchContext.Provider value={searchContext}>
            <NavigationProvider>
              {ui}
            </NavigationProvider>
          </SearchContext.Provider>
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
