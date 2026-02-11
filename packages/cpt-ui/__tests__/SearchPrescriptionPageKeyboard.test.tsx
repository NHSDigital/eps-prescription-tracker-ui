import "@testing-library/jest-dom"
import {render, fireEvent, act} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import React from "react"

import SearchPrescriptionPage from "@/pages/SearchPrescriptionPage"
import {AuthContext, AuthContextType} from "@/context/AuthProvider"
import {AccessContext} from "@/context/AccessProvider"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"

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

// Mock react-router-dom navigate
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate
}))

// Mock contexts
const defaultAuthContext: AuthContextType = {
  error: null,
  user: null,
  isSignedIn: false,
  isSigningIn: false,
  isSigningOut: false,
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
  setIsSigningOut: jest.fn(),
  remainingSessionTime: undefined
}

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
  searchType: "prescriptionId",
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
  setSearchType: jest.fn(),
  getAllSearchParameters: jest.fn(),
  setAllSearchParameters: jest.fn()
}

const renderWithProviders = (
  ui: React.ReactElement,
  {
    initialEntries = ["/search-by-prescription-id"],
    authContext = defaultAuthContext,
    searchContext = defaultSearchContext
  } = {}
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={authContext}>
        <AccessContext.Provider value={{
          sessionTimeoutInfo: {showModal: false, timeLeft: 0},
          onStayLoggedIn: jest.fn(),
          onLogOut: jest.fn()
        }}>
          <SearchContext.Provider value={searchContext}>
            {ui}
          </SearchContext.Provider>
        </AccessContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe("SearchPrescriptionPage - Keyboard Navigation Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("handles arrow right key navigation when no input is focused", () => {
    const mockQuerySelectorAll = jest.fn().mockReturnValue([
      {focus: jest.fn()},
      {focus: jest.fn()},
      {focus: jest.fn()}
    ])
    jest.spyOn(document, "querySelectorAll").mockImplementation(mockQuerySelectorAll)

    renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-prescription-id"]
    })

    // Simulate arrow right key press
    fireEvent.keyDown(document, {
      key: "ArrowRight"
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(mockNavigate).toHaveBeenCalledWith("/search-by-nhs-number")
  })

  it("handles arrow left key navigation when no input is focused", () => {
    const mockQuerySelectorAll = jest.fn().mockReturnValue([
      {focus: jest.fn()},
      {focus: jest.fn()},
      {focus: jest.fn()}
    ])
    jest.spyOn(document, "querySelectorAll").mockImplementation(mockQuerySelectorAll)

    renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-prescription-id"]
    })

    // Simulate arrow left key press (should wrap to last tab)
    fireEvent.keyDown(document, {
      key: "ArrowLeft"
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(mockNavigate).toHaveBeenCalledWith("/search-by-basic-details")
  })

  it("handles arrow left key navigation from middle tab", () => {
    const mockQuerySelectorAll = jest.fn().mockReturnValue([
      {focus: jest.fn()},
      {focus: jest.fn()},
      {focus: jest.fn()}
    ])
    jest.spyOn(document, "querySelectorAll").mockImplementation(mockQuerySelectorAll)

    renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-nhs-number"]
    })

    // Simulate arrow left key press
    fireEvent.keyDown(document, {
      key: "ArrowLeft"
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(mockNavigate).toHaveBeenCalledWith("/search-by-prescription-id")
  })

  it("handles arrow right key navigation from last tab (wraps to first)", () => {
    const mockQuerySelectorAll = jest.fn().mockReturnValue([
      {focus: jest.fn()},
      {focus: jest.fn()},
      {focus: jest.fn()}
    ])
    jest.spyOn(document, "querySelectorAll").mockImplementation(mockQuerySelectorAll)

    renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-basic-details"]
    })

    // Simulate arrow right key press (should wrap to first tab)
    fireEvent.keyDown(document, {
      key: "ArrowRight"
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(mockNavigate).toHaveBeenCalledWith("/search-by-prescription-id")
  })

  it("ignores keyboard navigation when input is focused", () => {
    // Mock an input element being focused
    const mockInputElement = document.createElement("input")
    Object.defineProperty(document, "activeElement", {
      get: () => mockInputElement,
      configurable: true
    })

    renderWithProviders(<SearchPrescriptionPage />)

    // Simulate arrow right key press
    fireEvent.keyDown(document, {
      key: "ArrowRight"
    })

    // Should not navigate when input is focused
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("ignores keyboard navigation when textarea is focused", () => {
    // Mock a textarea element being focused
    const mockTextarea = document.createElement("textarea")
    Object.defineProperty(document, "activeElement", {
      get: () => mockTextarea,
      configurable: true
    })

    renderWithProviders(<SearchPrescriptionPage />)

    fireEvent.keyDown(document, {
      key: "ArrowLeft"
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("ignores keyboard navigation when select is focused", () => {
    const mockSelect = document.createElement("select")
    Object.defineProperty(document, "activeElement", {
      get: () => mockSelect,
      configurable: true
    })

    renderWithProviders(<SearchPrescriptionPage />)

    fireEvent.keyDown(document, {
      key: "ArrowRight"
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("ignores keyboard navigation when contenteditable element is focused", () => {
    const mockContentEditable = document.createElement("div")
    mockContentEditable.setAttribute("contenteditable", "true")
    Object.defineProperty(document, "activeElement", {
      get: () => mockContentEditable,
      configurable: true
    })

    renderWithProviders(<SearchPrescriptionPage />)

    fireEvent.keyDown(document, {
      key: "ArrowLeft"
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("ignores other keys when no input is focused", () => {
    renderWithProviders(<SearchPrescriptionPage />)

    // Simulate other key presses
    fireEvent.keyDown(document, {key: "Enter"})
    fireEvent.keyDown(document, {key: "Space"})
    fireEvent.keyDown(document, {key: "Tab"})

    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
