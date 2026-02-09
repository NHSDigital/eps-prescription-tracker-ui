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
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"
import {NavigationProvider} from "@/context/NavigationProvider"

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

const mockAuthContext: AuthContextType = {
  error: null,
  user: null,
  isSignedIn: true,
  authStatus: "signed_in",
  isSigningIn: false,
  invalidSessionCause: undefined,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  selectedRole: undefined,
  userDetails: undefined,
  isConcurrentSession: false,
  sessionId: undefined,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  hasSingleRoleAccess: jest.fn().mockReturnValue(false),
  updateSelectedRole: jest.fn(),
  updateTrackerUserInfo: jest.fn(),
  updateInvalidSessionCause: jest.fn(),
  isSigningOut: false
}

const mockClearSearchParameters = jest.fn()
const mockSetPrescriptionId = jest.fn()
const mockSetIssueNumber = jest.fn()
const mockSetFirstName = jest.fn()
const mockSetLastName = jest.fn()
const mockSetDobDay = jest.fn()
const mockSetDobMonth = jest.fn()
const mockSetDobYear = jest.fn()
const mockSetPostcode = jest.fn()
const mockSetNhsNumber = jest.fn()
const mockGetAllSearchParameters = jest.fn()
const mockSetAllSearchParameters = jest.fn()
const mockSetSearchType = jest.fn()
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
  searchType: undefined,
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
  setAllSearchParameters: mockSetAllSearchParameters,
  setSearchType: mockSetSearchType
}

const LocationDisplay = () => {
  const location = useLocation()
  return <div data-testid="location-display">{location.pathname + location.search}</div>
}

const renderWithRouter = () =>
  render(
    <MemoryRouter initialEntries={["/search"]}>
      <AuthContext.Provider value={mockAuthContext}>
        <SearchContext.Provider value={defaultSearchState}>
          <NavigationProvider>
            <Routes>
              <Route path="/search" element={<PrescriptionIdSearch />} />
              <Route path="*" element={<LocationDisplay />} />
            </Routes>
          </NavigationProvider>
        </SearchContext.Provider>
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
  beforeEach(() => {
    jest.resetAllMocks()
    jest.clearAllMocks()
  })

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
