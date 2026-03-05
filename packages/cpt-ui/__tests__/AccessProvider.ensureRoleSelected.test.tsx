import React from "react"
import {render, waitFor} from "@testing-library/react"
import {AccessProvider} from "@/context/AccessProvider"
import {FRONTEND_PATHS} from "@/constants/environment"
import {AuthContext, AuthContextType} from "@/context/AuthProvider"
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
    error: jest.fn()
  }
}))

jest.mock("@/helpers/logout", () => ({
  handleRestartLogin: jest.fn(),
  signOut: jest.fn()
}))

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
  }

  const nonBlockingScenarios: Array<Scenario> = [
    {
      name: "signed in user with selected role at root redirects to search",
      initialPath: "/",
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {role_name: "Test Role"}
      },
      expectedPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
    },
    {
      name: "signed in user with selected role at login redirects to search",
      initialPath: FRONTEND_PATHS.LOGIN,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {role_name: "Test Role"}
      },
      expectedPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
    },
    {
      name: "signed out user at root redirects to login",
      initialPath: "/",
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined
      },
      expectedPath: FRONTEND_PATHS.LOGIN
    },
    {
      name: "signed out user on protected route redirects to login",
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined
      },
      expectedPath: FRONTEND_PATHS.LOGIN
    },
    {
      name: "signing out user with invalid session cause on protected route redirects to login",
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
    {
      name: "signed in user that has no role selected and not on allowed no role paths is redirected to select role",
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isSigningOut: false,
        selectedRole: undefined
      },
      expectedPath: FRONTEND_PATHS.SELECT_YOUR_ROLE
    },
    {
      name: "signed in user with a selected role on root or login is redirected to search",
      initialPath: FRONTEND_PATHS.LOGIN,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {role_name: "Test Role"}
      },
      expectedPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
    },
    {
      name: "signed in user has concurrent session and not on session selection is redirected to session selection",
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        isSigningOut: false,
        isConcurrentSession: true,
        selectedRole: {role_name: "Test Role"}
      },
      expectedPath: FRONTEND_PATHS.SESSION_SELECTION
    }
  ]

  const noRedirectScenarios: Array<Scenario> = [
    {
      name: "signed out user on non-root public route doesnt get redirected",
      initialPath: FRONTEND_PATHS.COOKIES,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined
      }
    },
    {
      name: "user on public path regardless of state doesnt redirect",
      initialPath: FRONTEND_PATHS.COOKIES,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {role_name: "Test Role"}
      }
    }
  ]

  // const signoutScenarios: Array<Scenario> = [
  //   {
  //     name: "signed in user that is signing out and not on logout triggers restart login and remains blocked",
  //     initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
  //     authStateOverrides: {
  //       isSignedIn: true,
  //       isSigningIn: false,
  //       isSigningOut: true,
  //       selectedRole: undefined
  //     },
  //     expectedPath: FRONTEND_PATHS.LOGIN
  //   },
  //   {
  //     name: "signing out user on protected route will be logged out",
  //     initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
  //     authStateOverrides: {
  //       isSignedIn: false,
  //       isSigningIn: false,
  //       isSigningOut: true,
  //       selectedRole: undefined
  //     },
  //     expectedPath: FRONTEND_PATHS.LOGIN
  //   }
  // ]

  it.each(nonBlockingScenarios)(
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
})

//   name: "signing in user on allowed no-role pages remains blocked while transition completes",
//   initialPath: FRONTEND_PATHS.SELECT_YOUR_ROLE,
//   authStateOverrides: {
//     isSignedIn: false,
//     isSigningIn: true,
//     isSigningOut: false,
//     selectedRole: undefined
//   },
//   expectedPath: FRONTEND_PATHS.SELECT_YOUR_ROLE
// },
