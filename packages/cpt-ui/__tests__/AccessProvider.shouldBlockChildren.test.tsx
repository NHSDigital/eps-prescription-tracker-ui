import React from "react"
import {render, waitFor, screen} from "@testing-library/react"
import {AccessProvider} from "@/context/AccessProvider"
import {AuthContext, AuthContextType} from "@/context/AuthProvider"
import {MemoryRouter} from "react-router-dom"
import {mockAuthState} from "./mocks/AuthStateMock"
import {FRONTEND_PATHS} from "@/constants/environment"

jest.mock("@/components/EpsHeader", () => ({
  __esModule: true,
  default: jest.fn(() => null)
}))

jest.mock("@/helpers/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock("@/helpers/logout", () => ({
  handleSignoutEvent: jest.fn(),
  signOut: jest.fn(),
  checkForRecentLogoutMarker: jest.fn().mockReturnValue(false)
}))

jest.mock("@/helpers/tabHelpers", () => {
  const actual = jest.requireActual("@/helpers/tabHelpers")
  return {
    ...actual,
    getOrCreateTabId: jest.fn().mockReturnValue("default-tab"),
    getOpenTabCount: jest.fn().mockReturnValue(1),
    updateOpenTabs: jest.fn(),
    heartbeatTab: jest.fn(),
    pruneStaleTabIds: jest.fn()
  }
})

// Mock useNavigate and assign to a variable for assertions
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe("shouldBlockChildren", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  const renderWithProvider = (
    authStateOverrides: Partial<AuthContextType> = {},
    initialPath: string
  ) => {
    const authContextValue: AuthContextType = {
      ...mockAuthState,
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null}),
      clearAuthState: jest.fn(),
      ...authStateOverrides
    }

    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthContext.Provider value={authContextValue}>
          <AccessProvider><><h1 data-testid="not-blocked-header">Not blocked</h1></>
          </AccessProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    )
  }

  type Scenario = {
    name: string;
    initialPath: string;
    authStateOverrides: Partial<AuthContextType>;
  }

  const blockingScenarios: Array<Scenario> = [
    {
      name: "not signed in, not signing in, on protected path", // has a redirection test
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined
      }
    },
    {
      name: "not signed in, not signing in, on protected path, with logout marker", // has a redirection test
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined,
        logoutMarker: {
          timestamp: Date.now(),
          reason: "signOut",
          initiatedByTabId: "tab-a"
        }
      }
    },
    {
      name: "not signed in, not signing in, on protected path, with stale logout marker", // has a redirection test
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined,
        logoutMarker: {
          timestamp: Date.now() - 60000,
          reason: "signOut",
          initiatedByTabId: "tab-a"
        }
      }
    },
    { // has a redirection test
      name: "not signed in, signing in, on select your role, with no search params",
      initialPath: FRONTEND_PATHS.SELECT_YOUR_ROLE,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: true
      }
    },
    { // has a redirection test
      name: "not signed in, signing in, on select your role, with search params",
      initialPath: FRONTEND_PATHS.SELECT_YOUR_ROLE + "?code=test",
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: true
      }
    },
    {
      name: "not signed in, signing in, on protected path", // has a redirection test
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: true,
        selectedRole: undefined
      }
    },
    {
      name: "not signed in, signing out, has invalid session cause, on protected path", // has a redirection test
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        isSigningOut: true,
        invalidSessionCause: "Session expired",
        selectedRole: undefined
      }
    },
    {
      name: "signed in, concurrent session, on protected page", // has a redirection test
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isSigningOut: false,
        isConcurrentSession: true,
        selectedRole: undefined
      }
    },
    {
      name: "signed in, no selected role, on protected path", // has a redirection test
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isSigningOut: false,
        isConcurrentSession: false,
        selectedRole: undefined
      }
    },
    {
      name: "signed in, has selected role, on root path", // has redirection test
      initialPath: "/",
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isSigningOut: false,
        isConcurrentSession: false,
        selectedRole: {"role_name": "Test Role"}
      }
    },
    {
      name: "signed in, has selected role, on login", // has redirection test
      initialPath: FRONTEND_PATHS.LOGIN,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isSigningOut: false,
        isConcurrentSession: false,
        selectedRole: {"role_name": "Test Role"}
      }
    },
    {
      name: "signed in, signing in, on protected path", // has a redirection test
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: true,
        isSigningOut: false,
        isConcurrentSession: false,
        selectedRole: undefined
      }
    },
    {
      name: "signed in, signing out, on protected path", // has a redirection test
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isSigningOut: true,
        isConcurrentSession: false,
        selectedRole: undefined
      }
    }
  ]

  const nonBlockingScenarios: Array<Scenario> = [
    {
      name: "not signed in, on public path", // has a redirection test
      initialPath: FRONTEND_PATHS.COOKIES,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined
      }
    },
    {
      name: "not signed in, on root path", // has a redirection test
      initialPath: "/",
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined
      }
    },
    {
      name: "signed in, on public path",
      initialPath: FRONTEND_PATHS.COOKIES,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: undefined
      }
    },
    {
      name: "signed in, concurrent session, no selected role, on public path",
      initialPath: FRONTEND_PATHS.COOKIES,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isConcurrentSession: true,
        selectedRole: undefined
      }
    },
    {
      name: "signed in, concurrent session, with selected role, on public path",
      initialPath: FRONTEND_PATHS.COOKIES,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isConcurrentSession: true,
        selectedRole: {"role_name": "Test Role"}
      }
    },
    {
      name: "signed in, role selected, on public path", // has a redirection test
      initialPath: FRONTEND_PATHS.COOKIES,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {"role_name": "Test Role"}
      }
    },
    {
      name: "signed in, on allowed no-role path", // has a redirection test
      initialPath: FRONTEND_PATHS.SELECT_YOUR_ROLE,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: undefined
      }
    },
    {
      name: "signed in, role selected, on protected path", // has a redirection test
      initialPath: FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {"role_name": "Test Role"}
      }
    },
    {
      name: "signed in, role selected, on allowed no roles path, doesnt redirect", // has a redirection test
      initialPath: FRONTEND_PATHS.SELECT_YOUR_ROLE,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {role_name: "Test Role"}
      }
    },
    {
      name: "signed in, signing out, on public path, redirects to logout", // has a redirection test
      initialPath: FRONTEND_PATHS.COOKIES,
      authStateOverrides: {
        isSignedIn: true,
        isSigningOut: true
      }
    },
    {
      name: "signed in, signing out, on root path, redirects to logout", // has a redirection test
      initialPath: "/",
      authStateOverrides: {
        isSignedIn: true,
        isSigningOut: true
      }
    }
  ]

  it.each(blockingScenarios)(
    "Blocking expected - $name",
    async ({
      initialPath,
      authStateOverrides
    }) => {
      renderWithProvider(authStateOverrides, initialPath)

      await waitFor(() => {
        expect(screen.getByTestId("loading-page-header")).toBeInTheDocument()
      })
    }
  )

  it.each(nonBlockingScenarios)(
    "Non-blocking expected - $name",
    async ({
      initialPath,
      authStateOverrides
    }) => {
      renderWithProvider(authStateOverrides, initialPath)

      await waitFor(() => {
        // expect(logger.info).toHaveBeenCalledWith("value")
        expect(screen.getByTestId("not-blocked-header")).toBeInTheDocument()
        expect(screen.queryByTestId("loading-page-header")).not.toBeInTheDocument()
      })
    }
  )
})
