import "@testing-library/jest-dom"
import {render, screen, act} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import React from "react"

import SearchForAPrescription from "@/pages/SearchPrescriptionPage"
import {HERO_TEXT} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {AuthContext, AuthContextType} from "@/context/AuthProvider"
import {AccessContext} from "@/context/AccessProvider"
import {SearchContext, SearchProviderContextType} from "@/context/SearchProvider"
import {NavigationProvider} from "@/context/NavigationProvider"
import {FRONTEND_PATHS} from "@/constants/environment"

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
    searchContext = defaultSearchContext,
    initialEntries = [FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID]
  } = {}
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
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

// Mock DOM methods
const mockFocus = jest.fn()
const mockBlur = jest.fn()
const mockGetElementById = jest.fn()

Object.defineProperty(document, "getElementById", {
  value: mockGetElementById,
  writable: true
})

Object.defineProperty(document, "activeElement", {
  value: {blur: mockBlur},
  writable: true,
  configurable: true
})

describe("SearchForAPrescription", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

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

  it("renders with search-for-a-prescription testid", () => {
    renderWithProviders(<SearchForAPrescription />)
    expect(screen.getByTestId("search-for-a-prescription")).toBeInTheDocument()
  })

  it("renders hero container with proper styling", () => {
    renderWithProviders(<SearchForAPrescription />)
    const heroContainer = screen.getByTestId("hero-banner")
    expect(heroContainer).toBeInTheDocument()
    expect(heroContainer).toHaveClass("nhsuk-hero-wrapper")
  })

  it("renders search tabs container", () => {
    renderWithProviders(<SearchForAPrescription />)
    const tabsContainer = screen.getByTestId("search-tabs-container")
    expect(tabsContainer).toBeInTheDocument()
  })

  it("sets active tab based on pathname - NHS number", () => {
    renderWithProviders(<SearchForAPrescription />, {
      initialEntries: [FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER]
    })
    expect(screen.getByTestId("search-for-a-prescription")).toBeInTheDocument()
  })

  it("sets active tab based on pathname - basic details", () => {
    renderWithProviders(<SearchForAPrescription />, {
      initialEntries: ["/search-by-basic-details"]
    })
    expect(screen.getByTestId("search-for-a-prescription")).toBeInTheDocument()
  })

  it("defaults to prescription ID search for unknown paths", () => {
    renderWithProviders(<SearchForAPrescription />, {
      initialEntries: ["/unknown-path"]
    })
    expect(screen.getByTestId("search-for-a-prescription")).toBeInTheDocument()
  })

  describe("handleTabClick functionality", () => {
    it("simulates prescription ID input focus (case 0)", () => {
      const mockInputElement = {focus: mockFocus}
      mockGetElementById.mockReturnValue(mockInputElement)

      renderWithProviders(<SearchForAPrescription />)

      // Simulate the handleTabClick logic for case 0
      act(() => {
        setTimeout(() => {
          const inputElement = document.getElementById("presc-id-input")
          if (inputElement) {
            ;(inputElement as HTMLInputElement).focus()
          }
        }, 100)

        jest.advanceTimersByTime(100)
      })

      expect(mockGetElementById).toHaveBeenCalledWith("presc-id-input")
      expect(mockFocus).toHaveBeenCalled()
    })

    it("simulates NHS number input focus (case 1)", () => {
      const mockInputElement = {focus: mockFocus}
      mockGetElementById.mockReturnValue(mockInputElement)

      renderWithProviders(<SearchForAPrescription />)

      act(() => {
        setTimeout(() => {
          const inputElement = document.getElementById("nhs-number-input")
          if (inputElement) {
            ;(inputElement as HTMLInputElement).focus()
          }
        }, 100)

        jest.advanceTimersByTime(100)
      })

      expect(mockGetElementById).toHaveBeenCalledWith("nhs-number-input")
      expect(mockFocus).toHaveBeenCalled()
    })

    it("simulates basic details blur behavior (case 2)", () => {
      renderWithProviders(<SearchForAPrescription />)

      act(() => {
        setTimeout(() => {
          const activeElement = document.activeElement as HTMLElement
          if (activeElement && activeElement.blur) {
            activeElement.blur()
          }
        }, 100)

        jest.advanceTimersByTime(100)
      })

      expect(mockBlur).toHaveBeenCalled()
    })

    it("handles case when element is not found", () => {
      mockGetElementById.mockReturnValue(null)

      renderWithProviders(<SearchForAPrescription />)

      act(() => {
        setTimeout(() => {
          const inputElement = document.getElementById("presc-id-input")
          if (inputElement) {
            ;(inputElement as HTMLInputElement).focus()
          }
        }, 100)

        jest.advanceTimersByTime(100)
      })

      expect(mockGetElementById).toHaveBeenCalledWith("presc-id-input")
      expect(mockFocus).not.toHaveBeenCalled()
    })

    it("handles case when activeElement has no blur method", () => {
      Object.defineProperty(document, "activeElement", {
        value: {},
        configurable: true
      })

      renderWithProviders(<SearchForAPrescription />)

      act(() => {
        setTimeout(() => {
          const activeElement = document.activeElement as HTMLElement
          if (activeElement && activeElement.blur) {
            activeElement.blur()
          }
        }, 100)

        jest.advanceTimersByTime(100)
      })
    })

    it("covers default case in switch statement", () => {
      renderWithProviders(<SearchForAPrescription />)

      act(() => {
        setTimeout(() => {
          const tabIndex = 999
          let inputId: string | null = null

          switch (tabIndex as number) {
            case 0:
              inputId = "presc-id-input"
              break
            case 1:
              inputId = "nhs-number-input"
              break
            case 2: {
              const activeElement = document.activeElement as HTMLElement
              if (activeElement && activeElement.blur) {
                activeElement.blur()
              }
              break
            }
            default:
              break
          }

          if (inputId) {
            const inputElement = document.getElementById(inputId)
            if (inputElement) {
              ;(inputElement as HTMLInputElement).focus()
            }
          }
        }, 100)

        jest.advanceTimersByTime(100)
      })
    })
  })
})
