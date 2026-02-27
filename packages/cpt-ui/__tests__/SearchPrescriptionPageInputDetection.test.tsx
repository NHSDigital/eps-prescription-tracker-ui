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

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate
}))

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
          onLogOut: jest.fn(),
          onTimeout: jest.fn()
        }}>
          <SearchContext.Provider value={searchContext}>
            {ui}
          </SearchContext.Provider>
        </AccessContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe("SearchPrescriptionPage - Input Detection and Aria-Live Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("detects input text in prescription ID field", () => {
    const mockInputElement = document.createElement("input")
    mockInputElement.value = "test-prescription-id"
    jest.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === "#presc-id-input") {
        return mockInputElement
      }
      return null
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-prescription-id"]
    })

    // Click on NHS number tab to trigger the check
    const tabs = container.querySelectorAll("button")
    const nhsTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("NHS number")
    )

    if (nhsTab) {
      fireEvent.click(nhsTab)
    }

    // Should show aria-live message for cleared input
    const ariaLiveRegion = container.querySelector('[aria-live="polite"]')
    expect(ariaLiveRegion).toHaveTextContent("Switched to a new tab, cleared input on the previous tab")
  })

  it("detects input text in NHS number field", () => {
    const mockInputElement = document.createElement("input")
    mockInputElement.value = "1234567890"
    jest.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === "#nhs-number-input") {
        return mockInputElement
      }
      return null
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-nhs-number"]
    })

    // Click on prescription ID tab to trigger the check
    const tabs = container.querySelectorAll("button")
    const prescTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("Prescription ID")
    )

    if (prescTab) {
      fireEvent.click(prescTab)
    }

    const ariaLiveRegion = container.querySelector('[aria-live="polite"]')
    expect(ariaLiveRegion).toHaveTextContent("Switched to a new tab, cleared input on the previous tab")
  })

  it("detects input text in basic details fields - first name", () => {
    const mockFirstNameInput = document.createElement("input")
    mockFirstNameInput.value = "John"
    jest.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === "#first-name-input") {
        return mockFirstNameInput
      }
      return document.createElement("input") // Return empty inputs for other fields
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-basic-details"]
    })

    const tabs = container.querySelectorAll("button")
    const prescTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("Prescription ID")
    )

    if (prescTab) {
      fireEvent.click(prescTab)
    }

    const ariaLiveRegion = container.querySelector('[aria-live="polite"]')
    expect(ariaLiveRegion).toHaveTextContent("Switched to a new tab, cleared inputs on the previous tab")
  })

  it("detects input text in basic details fields - last name", () => {
    const mockLastNameInput = document.createElement("input")
    mockLastNameInput.value = "Doe"
    jest.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === "#last-name-input") {
        return mockLastNameInput
      }
      return document.createElement("input")
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-basic-details"]
    })

    const tabs = container.querySelectorAll("button")
    const prescTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("Prescription ID")
    )

    if (prescTab) {
      fireEvent.click(prescTab)
    }

    const ariaLiveRegion = container.querySelector('[aria-live="polite"]')
    expect(ariaLiveRegion).toHaveTextContent("Switched to a new tab, cleared inputs on the previous tab")
  })

  it("detects input text in basic details fields - DOB day", () => {
    const mockDobDayInput = document.createElement("input")
    mockDobDayInput.value = "15"
    jest.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === "#dob-day-input") {
        return mockDobDayInput
      }
      return document.createElement("input")
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-basic-details"]
    })

    const tabs = container.querySelectorAll("button")
    const nhsTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("NHS number")
    )

    if (nhsTab) {
      fireEvent.click(nhsTab)
    }

    const ariaLiveRegion = container.querySelector('[aria-live="polite"]')
    expect(ariaLiveRegion).toHaveTextContent("Switched to a new tab, cleared inputs on the previous tab")
  })

  it("detects input text in basic details fields - DOB month", () => {
    const mockDobMonthInput = document.createElement("input")
    mockDobMonthInput.value = "03"
    jest.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === "#dob-month-input") {
        return mockDobMonthInput
      }
      return document.createElement("input")
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-basic-details"]
    })

    const tabs = container.querySelectorAll("button")
    const prescTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("Prescription ID")
    )

    if (prescTab) {
      fireEvent.click(prescTab)
    }

    const ariaLiveRegion = container.querySelector('[aria-live="polite"]')
    expect(ariaLiveRegion).toHaveTextContent("Switched to a new tab, cleared inputs on the previous tab")
  })

  it("detects input text in basic details fields - DOB year", () => {
    const mockDobYearInput = document.createElement("input")
    mockDobYearInput.value = "1990"
    jest.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === "#dob-year-input") {
        return mockDobYearInput
      }
      return document.createElement("input")
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-basic-details"]
    })

    const tabs = container.querySelectorAll("button")
    const nhsTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("NHS number")
    )

    if (nhsTab) {
      fireEvent.click(nhsTab)
    }

    const ariaLiveRegion = container.querySelector('[aria-live="polite"]')
    expect(ariaLiveRegion).toHaveTextContent("Switched to a new tab, cleared inputs on the previous tab")
  })

  it("detects input text in basic details fields - postcode", () => {
    const mockPostcodeInput = document.createElement("input")
    mockPostcodeInput.value = "SW1A 1AA"
    jest.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === "#postcode-input") {
        return mockPostcodeInput
      }
      return document.createElement("input")
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-basic-details"]
    })

    const tabs = container.querySelectorAll("button")
    const prescTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("Prescription ID")
    )

    if (prescTab) {
      fireEvent.click(prescTab)
    }

    const ariaLiveRegion = container.querySelector('[aria-live="polite"]')
    expect(ariaLiveRegion).toHaveTextContent("Switched to a new tab, cleared inputs on the previous tab")
  })

  it("handles null input elements in checkForInputText", () => {
    jest.spyOn(document, "querySelector").mockReturnValue(null)

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-prescription-id"]
    })

    const tabs = container.querySelectorAll("button")
    const nhsTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("NHS number")
    )

    if (nhsTab) {
      fireEvent.click(nhsTab)
    }

    // Should not crash and no aria-live message should appear
    const ariaLiveRegion = container.querySelector('[aria-live="polite"]')
    expect(ariaLiveRegion).toHaveTextContent("")
  })

  it("handles empty/whitespace-only input values", () => {
    const mockInputElement = document.createElement("input")
    mockInputElement.value = "   " // whitespace only
    jest.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === "#presc-id-input") {
        return mockInputElement
      }
      return null
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-prescription-id"]
    })

    const tabs = container.querySelectorAll("button")
    const nhsTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("NHS number")
    )

    if (nhsTab) {
      fireEvent.click(nhsTab)
    }

    // Should not show aria-live message for whitespace-only input
    const ariaLiveRegion = container.querySelector('[aria-live="polite"]')
    expect(ariaLiveRegion).toHaveTextContent("")
  })

  it("clears aria-live message after timeout", () => {
    const mockInputElement = document.createElement("input")
    mockInputElement.value = "test-input"
    jest.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === "#presc-id-input") {
        return mockInputElement
      }
      return null
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-prescription-id"]
    })

    const tabs = container.querySelectorAll("button")
    const nhsTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("NHS number")
    )

    if (nhsTab) {
      fireEvent.click(nhsTab)
    }

    const ariaLiveRegion = container.querySelector('[aria-live="polite"]')
    expect(ariaLiveRegion).toHaveTextContent("Switched to a new tab, cleared input on the previous tab")

    // Fast-forward time to trigger timeout
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(ariaLiveRegion).toHaveTextContent("")
  })

  it("does not show aria-live message when switching to the same tab", () => {
    const mockInputElement = document.createElement("input")
    mockInputElement.value = "test-input"
    jest.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === "#presc-id-input") {
        return mockInputElement
      }
      return null
    })

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-prescription-id"]
    })

    const tabs = container.querySelectorAll("button")
    const prescTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("Prescription ID")
    )

    if (prescTab) {
      fireEvent.click(prescTab) // Click the same tab
    }

    const ariaLiveRegion = container.querySelector('[aria-live="polite"]')
    expect(ariaLiveRegion).toHaveTextContent("")
  })

  it("does not show aria-live message when no input text exists", () => {
    jest.spyOn(document, "querySelector").mockReturnValue(document.createElement("input")) // Empty input

    const {container} = renderWithProviders(<SearchPrescriptionPage />, {
      initialEntries: ["/search-by-prescription-id"]
    })

    const tabs = container.querySelectorAll("button")
    const nhsTab = Array.from(tabs).find(tab =>
      tab.textContent?.includes("NHS number")
    )

    if (nhsTab) {
      fireEvent.click(nhsTab)
    }

    const ariaLiveRegion = container.querySelector('[aria-live="polite"]')
    expect(ariaLiveRegion).toHaveTextContent("")
  })
})
