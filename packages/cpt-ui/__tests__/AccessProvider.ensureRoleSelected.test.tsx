import React from "react"
import {render, waitFor} from "@testing-library/react"
import {AccessProvider} from "@/context/AccessProvider"
import {FRONTEND_PATHS} from "@/constants/environment"
import {
  AuthContext,
  AuthContextType,
  LogoutMarker,
  LOGOUT_MARKER_STORAGE_GROUP,
  LOGOUT_MARKER_STORAGE_KEY,
  TAB_ID_SESSION_KEY
} from "@/context/AuthProvider"
import {MemoryRouter} from "react-router-dom"
import {mockAuthState} from "./mocks/AuthStateMock"

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

const mockHandleRestartLogin = jest.fn()
jest.mock("@/helpers/logout", () => {
  const actual = jest.requireActual("@/helpers/logout")
  return {
    ...actual,
    handleRestartLogin: (...args: Array<unknown>) => mockHandleRestartLogin(...args),
    signOut: jest.fn()
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

describe("ensureRoleSelected", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
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
          <AccessProvider><></>
          </AccessProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    )
  }

  type Scenario = {
    name: string;
    initialPath: string;
    authStateOverrides: Partial<AuthContextType>;
    expectedPath?: string;
    logoutMarker?: Partial<LogoutMarker>
  }

  const redirectScenarios: Array<Scenario> = [
    {
      name: "signed in, has selected role, on root path, redirects to search", // has a render block test
      initialPath: "/",
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {role_name: "Test Role"}
      },
      expectedPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
    },
    {
      name: "signed in, has selected role, on login, redirects to search", // has a render block test
      initialPath: FRONTEND_PATHS.LOGIN,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {role_name: "Test Role"}
      },
      expectedPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
    },
    {
      name: "not signed in, on root path, redirects to login", // has a render block test
      initialPath: "/",
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined
      },
      expectedPath: FRONTEND_PATHS.LOGIN
    },
    {
      name: "not signed in, not signing in, on protected path, redirects to login", // has a render block test
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined
      },
      expectedPath: FRONTEND_PATHS.LOGIN
    },
    { // has a render block test
      name: "not signed in, signing out, has invalid session cause, on protected path, redirects to login",
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        isSigningOut: true,
        invalidSessionCause: "Session expired",
        selectedRole: undefined
      },
      expectedPath: FRONTEND_PATHS.LOGIN
    },
    { // has render block test
      name: "not signed in, on protected path, marker in state only, redirects to login",
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides:     {
        isSignedIn: false,
        isSigningIn: false,
        isSigningOut: false,
        selectedRole: undefined,
        logoutMarker: {
          timestamp: Date.now(),
          reason: "signOut",
          initiatedByTabId: "tab-a"
        }
      },
      expectedPath: FRONTEND_PATHS.LOGIN
    },
    { // has render block test
      name: "not signed in, on protected path, stale logout marker, redirects to login",
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        isSigningOut: false,
        selectedRole: undefined,
        logoutMarker: {
          timestamp: Date.now() - 60000,
          reason: "signOut",
          initiatedByTabId: "tab-a"
        }
      },
      expectedPath: FRONTEND_PATHS.LOGIN
    },
    { // has a render block test
      name: "signed in, no selected role selected, on protected path, is redirected to select role",
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isSigningOut: false,
        selectedRole: undefined
      },
      expectedPath: FRONTEND_PATHS.SELECT_YOUR_ROLE
    },
    { // has a render block test
      name: "signed in, concurrent session, on protected path, is redirected to session selection",
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isSigningOut: false,
        isConcurrentSession: true,
        selectedRole: {role_name: "Test Role"}
      },
      expectedPath: FRONTEND_PATHS.SESSION_SELECTION
    },
    { // has a render block test
      name: "not signed in, signing in, on protected path, redirected to login",
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: true,
        isSigningOut: false,
        selectedRole: undefined
      },
      expectedPath: FRONTEND_PATHS.LOGIN
    }
  ]

  const noRedirectScenarios: Array<Scenario> = [
    {
      name: "not signed in, on public path, doesnt redirect", // has a render block test
      initialPath: FRONTEND_PATHS.COOKIES,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined
      }
    },
    {
      name: "signed in, role selected, on public path, doesnt redirect", // has a render block test
      initialPath: FRONTEND_PATHS.COOKIES,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {role_name: "Test Role"}
      }
    },
    {
      name: "signed in, role selected, on allowed no roles path, doesnt redirect", // has a render block test
      initialPath: FRONTEND_PATHS.SELECT_YOUR_ROLE,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {role_name: "Test Role"}
      }
    },
    { // has a render block test
      name: "signed in, signing out, on public path, doesnt redirect",
      initialPath: FRONTEND_PATHS.COOKIES,
      authStateOverrides: {
        isSignedIn: true,
        isSigningOut: true
      }
    },
    {
      name: "not signed in, signing in, on select your role, with search params, doesnt redirect",
      initialPath: FRONTEND_PATHS.SELECT_YOUR_ROLE + "?code=test",
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: true
      }
    }
  ]

  const logoutScenarios: Array<Scenario> = [
    {
      name: "not signed in, signing in, on select your role, with no search params, redirects to session logged out",
      initialPath: FRONTEND_PATHS.SELECT_YOUR_ROLE,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: true
      }
    },
    { // has a render block test
      name: "signed in, signing out, has invalid session cause, on protected path, redirects to session logged out",
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: true,
        isSigningOut: true,
        invalidSessionCause: "Session expired"
      },
      expectedPath: FRONTEND_PATHS.SESSION_LOGGED_OUT
    },
    { // has a render block test
      name: "signed in, signing out, on protected path, redirects to logout",
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: true,
        isSigningOut: true
      },
      expectedPath: FRONTEND_PATHS.LOGOUT
    },
    { // has a render block test
      name: "signed in, signing out, on root path, redirects to logout",
      initialPath: "/",
      authStateOverrides: {
        isSignedIn: true,
        isSigningOut: true
      },
      expectedPath: FRONTEND_PATHS.LOGOUT
    }
  ]

  it.each(redirectScenarios)(
    "Redirection expected - $name",
    async ({
      initialPath,
      authStateOverrides,
      expectedPath
    }) => {
      renderWithProvider(authStateOverrides, initialPath)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(expectedPath)
      })
    }
  )

  it.each(noRedirectScenarios)(
    "No redirection expected - $name",
    async ({
      initialPath,
      authStateOverrides
    }) => {
      renderWithProvider(authStateOverrides, initialPath)

      expect(mockNavigate).not.toHaveBeenCalled()
    })

  it.each(logoutScenarios)(
    "Logout expected - $name",
    async ({
      initialPath,
      authStateOverrides
    }) => {
      renderWithProvider(authStateOverrides, initialPath)

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled()
        expect(mockHandleRestartLogin).toHaveBeenCalledWith(
          expect.objectContaining(authStateOverrides),
          authStateOverrides.invalidSessionCause, mockNavigate
        )
      })
    })

  it("redirects to logout for non-initiating tab when recent logout marker exists and multiple tabs are open",
    async () => {
      sessionStorage.setItem(TAB_ID_SESSION_KEY, "tab-b")
      localStorage.setItem("openTabIds", JSON.stringify(["tab-a", "tab-b"]))
      localStorage.setItem(
        LOGOUT_MARKER_STORAGE_GROUP,
        JSON.stringify({
          [LOGOUT_MARKER_STORAGE_KEY]: {
            timestamp: Date.now(),
            reason: "signOut",
            initiatedByTabId: "tab-a"
          }
        })
      )

      renderWithProvider(
        {
          isSignedIn: false,
          isSigningIn: false,
          isSigningOut: false,
          selectedRole: undefined
        },
        FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
      )

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.LOGOUT)
      })
    })

  it("does not force logout redirect for initiating tab even when marker is recent", async () => {
    sessionStorage.setItem(TAB_ID_SESSION_KEY, "tab-a")
    localStorage.setItem("openTabIds", JSON.stringify(["tab-a", "tab-b"]))
    localStorage.setItem(
      LOGOUT_MARKER_STORAGE_GROUP,
      JSON.stringify({
        [LOGOUT_MARKER_STORAGE_KEY]: {
          timestamp: Date.now(),
          reason: "signOut",
          initiatedByTabId: "tab-a"
        }
      })
    )

    renderWithProvider(
      {
        isSignedIn: false,
        isSigningIn: false,
        isSigningOut: false,
        selectedRole: undefined
      },
      FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.LOGIN)
    })
  })
})
