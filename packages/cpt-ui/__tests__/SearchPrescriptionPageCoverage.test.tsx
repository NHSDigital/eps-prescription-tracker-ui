import "@testing-library/jest-dom"
import {render, fireEvent, act} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import React from "react"

import SearchPrescriptionPage from "@/pages/SearchPrescriptionPage"
import {AuthContext, AuthContextType} from "@/context/AuthProvider"
import {AccessContext} from "@/context/AccessProvider"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"
import {mockAuthState} from "./mocks/AuthStateMock"

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
  ...mockAuthState,
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

const defaultAccessContext = {
  sessionTimeoutInfo: {showModal: false, timeLeft: 0},
  onStayLoggedIn: jest.fn(),
  onLogOut: jest.fn(),
  onTimeout: jest.fn()
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
    accessContext = defaultAccessContext,
    searchContext = defaultSearchContext
  } = {}
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={authContext}>
        <AccessContext.Provider value={accessContext}>
          <SearchContext.Provider value={searchContext}>
            {ui}
          </SearchContext.Provider>
        </AccessContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe("SearchPrescriptionPage - Coverage for handleTabClick Function", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it("covers handleTabClick case 0 - prescription ID tab with setTimeout and focus", () => {
    const mockInputElement = {
      focus: jest.fn()
    }
    jest.spyOn(document, "getElementById").mockReturnValue(mockInputElement as unknown as HTMLInputElement)

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-nhs-number"]
    })

    const tabs = container.querySelectorAll("button")
    const prescriptionTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("Prescription ID")
    )

    if (prescriptionTab) {
      fireEvent.click(prescriptionTab)

      act(() => {
        jest.advanceTimersByTime(100)
      })

      expect(mockNavigate).toHaveBeenCalledWith("/search-by-prescription-id")
      expect(document.getElementById).toHaveBeenCalledWith("presc-id-input")
      expect(mockInputElement.focus).toHaveBeenCalled()
    }
  })

  it("covers handleTabClick case 1 - NHS number tab with setTimeout and focus", () => {
    const mockInputElement = {
      focus: jest.fn()
    }
    jest.spyOn(document, "getElementById").mockReturnValue(mockInputElement as unknown as HTMLInputElement)

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-prescription-id"]
    })

    const tabs = container.querySelectorAll("button")
    const nhsTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("NHS number")
    )

    if (nhsTab) {
      fireEvent.click(nhsTab)

      act(() => {
        jest.advanceTimersByTime(100)
      })

      expect(mockNavigate).toHaveBeenCalledWith("/search-by-nhs-number")
      expect(document.getElementById).toHaveBeenCalledWith("nhs-number-input")
      expect(mockInputElement.focus).toHaveBeenCalled()
    }
  })

  it("covers handleTabClick case 2 - basic details tab with blur logic", () => {
    const mockActiveElement = {
      blur: jest.fn()
    }
    Object.defineProperty(document, "activeElement", {
      get: jest.fn(() => mockActiveElement),
      configurable: true
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-prescription-id"]
    })

    const tabs = container.querySelectorAll("button")
    const basicTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("Basic details")
    )

    if (basicTab) {
      fireEvent.click(basicTab)

      act(() => {
        jest.advanceTimersByTime(100)
      })

      expect(mockNavigate).toHaveBeenCalledWith("/search-by-basic-details")
      expect(mockActiveElement.blur).toHaveBeenCalled()
    }
  })

  it("covers error handling when getElementById returns null", () => {
    jest.spyOn(document, "getElementById").mockReturnValue(null)

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-nhs-number"]
    })

    const tabs = container.querySelectorAll("button")
    const prescriptionTab = tabs[0] as HTMLElement

    fireEvent.click(prescriptionTab)

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(document.getElementById).toHaveBeenCalled()
  })

  it("covers error handling when activeElement is null", () => {
    Object.defineProperty(document, "activeElement", {
      get: jest.fn(() => null),
      configurable: true
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-prescription-id"]
    })

    const tabs = container.querySelectorAll("button")
    const basicTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("Basic")
    )

    if (basicTab) {
      fireEvent.click(basicTab)

      act(() => {
        jest.advanceTimersByTime(100)
      })

    }
  })

  it("covers error handling when activeElement has no blur method", () => {
    Object.defineProperty(document, "activeElement", {
      get: jest.fn(() => ({})),
      configurable: true
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-prescription-id"]
    })

    const tabs = container.querySelectorAll("button")
    const basicTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("Basic")
    )

    if (basicTab) {
      fireEvent.click(basicTab)

      act(() => {
        jest.advanceTimersByTime(100)
      })

    }
  })

  it("verifies setTimeout is called with correct delay in handleTabClick", () => {
    const setTimeoutSpy = jest.spyOn(window, "setTimeout")

    const {container} = renderWithProviders(<SearchPrescriptionPage />)

    const tabs = container.querySelectorAll("button")
    const firstTab = tabs[0] as HTMLElement

    fireEvent.click(firstTab)

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100)

    setTimeoutSpy.mockRestore()
  })

  it("verifies setActiveTab state changes in handleTabClick", () => {
    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-prescription-id"]
    })

    const tabs = container.querySelectorAll("button")
    const nhsTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("NHS")
    )

    if (nhsTab) {
      fireEvent.click(nhsTab)

      expect(mockNavigate).toHaveBeenCalledWith("/search-by-nhs-number")
    }
  })
})
