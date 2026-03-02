import React from "react"
import {render, screen, waitFor} from "@testing-library/react"
import {AccessProvider, useAccess} from "@/context/AccessProvider"
import {FRONTEND_PATHS} from "@/constants/environment"
import {AuthContext, AuthContextType} from "@/context/AuthProvider"
import {MemoryRouter, Route, Routes} from "react-router-dom"
import {mockAuthState} from "./mocks/AuthStateMock"

const APP_ROUTES = {
  root: "/",
  login: FRONTEND_PATHS.LOGIN ?? "/login",
  logout: FRONTEND_PATHS.LOGOUT ?? "/logout",
  sessionLoggedOut: FRONTEND_PATHS.SESSION_LOGGED_OUT ?? "/session-logged-out",
  cookies: FRONTEND_PATHS.COOKIES ?? "/cookies",
  search: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID ?? "/search-by-prescription-id",
  selectRole: FRONTEND_PATHS.SELECT_YOUR_ROLE ?? "/select-your-role",
  sessionSelection: FRONTEND_PATHS.SESSION_SELECTION ?? "/select-active-session",
  protected: "/some-protected"
}

jest.mock("@/components/EpsHeader", () => ({
  __esModule: true,
  default: jest.fn(() => null)
}))

jest.mock("@/helpers/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock("@/helpers/logout", () => ({
  handleRestartLogin: jest.fn(),
  signOut: jest.fn()
}))

const TestComponent = () => {
  useAccess() // Just to test the context
  return <div>Test Component</div>
}

describe("AccessProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderWithProvider = (
    initialPath: string,
    authStateOverrides: Partial<AuthContextType> = {}
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
          <AccessProvider>
            <Routes>
              <Route path="/" element={<div data-testid="route-root">Root</div>} />
              <Route path={APP_ROUTES.login} element={<div data-testid="route-login">Login</div>} />
              <Route path={APP_ROUTES.logout} element={<div data-testid="route-logout">Logout</div>} />
              <Route
                path={APP_ROUTES.sessionLoggedOut}
                element={<div data-testid="route-session-logged-out">Session Logged Out</div>}
              />
              <Route path={APP_ROUTES.cookies} element={<div data-testid="route-cookies">Cookies</div>} />
              <Route
                path={APP_ROUTES.sessionSelection}
                element={<div data-testid="route-session-selection">Session Selection</div>}
              />
              <Route
                path={APP_ROUTES.search}
                element={<div data-testid="route-search">Search</div>}
              />
              <Route
                path={APP_ROUTES.selectRole}
                element={<div data-testid="route-select-role">Select Role</div>}
              />
              <Route
                path={APP_ROUTES.protected}
                element={<div data-testid="route-protected">Protected</div>}
              />
              <Route path="*" element={<div data-testid="route-not-found">Not Found</div>} />
            </Routes>
            <TestComponent />
          </AccessProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    )
  }

  type Scenario = {
    name: string;
    initialPath: string;
    authStateOverrides: Partial<AuthContextType>;
    expectedRouteTestId?: string;
    expectBlocked?: boolean;
    expectRestartLoginCall?: boolean;
  }

  const scenarios: Array<Scenario> = [
    {
      name: "signed in user with selected role at root redirects to search",
      initialPath: APP_ROUTES.root,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {role_name: "Test Role"}
      },
      expectedRouteTestId: "route-search"
    },
    {
      name: "signed in user with selected role at login redirects to search",
      initialPath: APP_ROUTES.login,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {role_name: "Test Role"}
      },
      expectedRouteTestId: "route-search"
    },
    {
      name: "user on public path regardless of state doesnt redirect",
      initialPath: APP_ROUTES.cookies,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {role_name: "Test Role"}
      },
      expectedRouteTestId: "route-cookies"
    },
    {
      name: "signed out user at root redirects to login",
      initialPath: APP_ROUTES.root,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined
      },
      expectedRouteTestId: "route-login"
    },
    {
      name: "signed out user on protected route redirects to login",
      initialPath: APP_ROUTES.protected,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined
      },
      expectedRouteTestId: "route-login"
    },
    {
      name: "signed out user on non-root public route doesnt get redirected",
      initialPath: APP_ROUTES.cookies,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined
      },
      expectedRouteTestId: "route-cookies"
    },
    {
      name: "signing out user on protected route redirects to login",
      initialPath: APP_ROUTES.protected,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        isSigningOut: true,
        selectedRole: undefined
      },
      expectBlocked: true,
      expectRestartLoginCall: true
    },
    {
      name: "signing out user with invalid session cause on protected route redirects to login",
      initialPath: APP_ROUTES.protected,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        isSigningOut: true,
        invalidSessionCause: "Session expired",
        selectedRole: undefined
      },
      expectedRouteTestId: "route-login"
    },
    {
      name: "signing in user on allowed no-role pages remains blocked while transition completes",
      initialPath: APP_ROUTES.selectRole,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: true,
        isSigningOut: false,
        selectedRole: undefined
      },
      expectBlocked: true
    },
    {
      name: "signed in user that is signing out and not on logout triggers restart login and remains blocked",
      initialPath: APP_ROUTES.protected,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isSigningOut: true,
        selectedRole: undefined
      },
      expectBlocked: true,
      expectRestartLoginCall: true
    },
    {
      name: "signed in user that concurrent session and not on session selection is redirected to session selection",
      initialPath: APP_ROUTES.protected,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isSigningOut: false,
        isConcurrentSession: true,
        selectedRole: {role_name: "Test Role"}
      },
      expectedRouteTestId: "route-session-selection"
    },
    {
      name: "signed in user that has no role selected and not on allowed no role paths is redirected to select role",
      initialPath: APP_ROUTES.protected,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isSigningOut: false,
        selectedRole: undefined
      },
      expectedRouteTestId: "route-select-role"
    },
    {
      name: "signed in user with a selected role on root or login is redirected to search",
      initialPath: APP_ROUTES.login,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {role_name: "Test Role"}
      },
      expectedRouteTestId: "route-search"
    }
  ]

  it.each(scenarios)(
    "$name",
    async ({
      initialPath,
      authStateOverrides,
      expectedRouteTestId
    }) => {
      renderWithProvider(initialPath, authStateOverrides)

      await waitFor(() => {
        expect(screen.getByTestId(expectedRouteTestId as string)).toBeInTheDocument()
        expect(screen.queryByTestId("route-not-found")).not.toBeInTheDocument()
      })
    }
  )

  it("shows redirect processing page when concurrent session exists on protected route", async () => {
    renderWithProvider(APP_ROUTES.protected, {
      isSignedIn: true,
      isConcurrentSession: true,
      isSigningIn: false,
      selectedRole: {role_name: "Test Role"}
    })

    await waitFor(() => {
      expect(screen.getByText("You're being redirected")).toBeInTheDocument()
      expect(screen.queryByTestId("route-protected")).not.toBeInTheDocument()
    })
  })
})
