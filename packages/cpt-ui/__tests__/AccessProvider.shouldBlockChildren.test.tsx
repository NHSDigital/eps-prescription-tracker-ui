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

describe("shouldBlockChildren", () => {
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
      name: "not signed in, not signing in, on non-public path",
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: false,
        selectedRole: undefined
      }
    },
    {
      name: "not signed in, signing in, on non-public path",
      initialPath: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
      authStateOverrides: {
        isSignedIn: false,
        isSigningIn: true,
        selectedRole: undefined
      }
    },
    {
      name: "signed in, concurrent session, not on session selection page or public path",
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
      name: "signed in, no selected role, not on allowed no-role path",
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
      name: "signed in, has selected role, on root path",
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
      name: "signed in, has selected role, on login",
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
      name: "signed in, is signing in, not on allowed no-role path",
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
      name: "signed in, is signing out, not on allowed no-role path",
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
      name: "not signed in, on public path",
      initialPath: FRONTEND_PATHS.COOKIES,
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
      name: "signed in, with selected role, on public path",
      initialPath: FRONTEND_PATHS.COOKIES,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {"role_name": "Test Role"}
      }
    },
    {
      name: "signed in, no selected role, on allowed no-role path",
      initialPath: FRONTEND_PATHS.SELECT_YOUR_ROLE,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: undefined
      }
    },
    {
      name: "signed in, with selected role, on allowed no-role path",
      initialPath: FRONTEND_PATHS.SELECT_YOUR_ROLE,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {"role_name": "Test Role"}
      }
    },
    {
      name: "signed in, with selected role, on protected path",
      initialPath: FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER,
      authStateOverrides: {
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {"role_name": "Test Role"}
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
