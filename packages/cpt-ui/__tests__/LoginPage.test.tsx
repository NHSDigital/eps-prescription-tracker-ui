import "@testing-library/jest-dom"
import {render, screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React, {useState} from "react"
import {MemoryRouter} from "react-router-dom"
import {AuthContext, type AuthContextType} from "@/context/AuthProvider"
import LoginPage from "@/pages/LoginPage"

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom")
  return {
    ...actual,
    useNavigate: jest.fn()
  }
})

const mockCognitoSignIn = jest.fn()
const mockCognitoSignOut = jest.fn()

// Set up environment mock before any imports
jest.mock("@/constants/environment", () => ({
  ENV_CONFIG: {
    TARGET_ENVIRONMENT: "dev",
    API_DOMAIN_OVERRIDE: "",
    BASE_PATH: "site",
    LOCAL_DEV: false
  },
  AUTH_CONFIG: {
    USER_POOL_ID: "mock-pool-id",
    USER_POOL_CLIENT_ID: "mock-client-id",
    HOSTED_LOGIN_DOMAIN: "mock-domain",
    REDIRECT_SIGN_IN: "mock-signin",
    REDIRECT_SIGN_OUT: "mock-signout"
  },
  AUTO_LOGIN_ENVIRONMENTS: [
    {environment: "dev", loginMethod: "mock"},
    {environment: "dev-pr", loginMethod: "mock"},
    {environment: "int", loginMethod: "cis2"},
    {environment: "prod", loginMethod: "cis2"}
  ],
  API_ENDPOINTS: {
    TRACKER_USER_INFO: "/api/tracker-user-info",
    SELECTED_ROLE: "/api/selected-role"
  },
  APP_CONFIG: {
    REACT_LOG_LEVEL: "debug"
  },
  FRONTEND_PATHS: {
    SEARCH_BY_PRESCRIPTION_ID: "dummy_search_redirect"
  }
}))

// Mock the configureAmplify module
jest.mock("@/context/configureAmplify", () => ({
  __esModule: true,
  authConfig: {
    Auth: {
      Cognito: {
        userPoolClientId: "mockUserPoolClientId",
        userPoolId: "mockUserPoolId",
        loginWith: {
          oauth: {
            domain: "mockHostedLoginDomain",
            scopes: [
              "openid",
              "email",
              "phone",
              "profile",
              "aws.cognito.signin.user.admin"
            ],
            redirectSignIn: ["mockRedirectSignIn"],
            redirectSignOut: ["mockRedirectSignOut"],
            responseType: "code"
          },
          username: true,
          email: false,
          phone: false
        }
      }
    }
  }
}))

const defaultAuthState: AuthContextType = {
  isSignedIn: false,
  isSigningIn: false,
  invalidSessionCause: undefined,
  user: null,
  error: null,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  selectedRole: undefined,
  userDetails: undefined,
  isConcurrentSession: false,
  sessionId: undefined,
  cognitoSignIn: mockCognitoSignIn,
  cognitoSignOut: mockCognitoSignOut,
  clearAuthState: jest.fn(),
  hasSingleRoleAccess: jest.fn().mockReturnValue(false),
  updateSelectedRole: jest.fn(),
  updateTrackerUserInfo: jest.fn(),
  updateInvalidSessionCause: jest.fn(),
  isSigningOut: false,
  setIsSigningOut: jest.fn()
}

const MockAuthProvider = ({
  children,
  initialState = defaultAuthState
}: {
  children: React.ReactNode;
  initialState?: AuthContextType;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [authState, setAuthState] = useState<AuthContextType>({
    ...initialState,
    cognitoSignIn: mockCognitoSignIn,
    cognitoSignOut: mockCognitoSignOut
  })

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  )
}

// Mock the AccessProvider context
jest.mock("@/context/AccessProvider", () => {
  let mockContextValue = {
    clear: jest.fn()
  }

  const MockAccessContext = React.createContext(mockContextValue)
  const useAccess = () => React.useContext(MockAccessContext)

  return {
    AccessContext: MockAccessContext,
    useAccess
  }
})

const renderWithProviders = (
  component: React.ReactElement,
  initialState = defaultAuthState
) => {
  return render(
    <MockAuthProvider initialState={initialState}>
      <MemoryRouter>{component}</MemoryRouter>
    </MockAuthProvider>
  )
}

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the page and the main buttons", () => {
    // Get the mocked module
    const envModule = jest.requireMock("@/constants/environment")

    // Modify the environment config temporarily
    envModule.ENV_CONFIG = {
      ...envModule.ENV_CONFIG,
      TARGET_ENVIRONMENT: "qa"
    }
    const {container} = renderWithProviders(<LoginPage />)

    const heading = screen.getByRole("heading", {level: 1})
    expect(heading).toBeInTheDocument()

    const primaryLogin = container.querySelector("#primary-signin")
    const mockLogin = container.querySelector("#mock-signin")
    const signout = container.querySelector("#signout")

    expect(primaryLogin).toBeInTheDocument()
    expect(mockLogin).toBeInTheDocument()
    expect(signout).toBeInTheDocument()
  })

  it("calls cognitoSignIn with 'Primary' when the primary login button is clicked", async () => {
    // Get the mocked module
    const envModule = jest.requireMock("@/constants/environment")

    // Modify the environment config temporarily
    envModule.ENV_CONFIG = {
      ...envModule.ENV_CONFIG,
      TARGET_ENVIRONMENT: "qa"
    }
    renderWithProviders(<LoginPage />)

    const primaryLogin = screen.getByRole("button", {
      name: /Log in with PTL CIS2/i
    })
    await userEvent.click(primaryLogin)

    await waitFor(() => {
      expect(mockCognitoSignIn).toHaveBeenCalledWith({
        provider: {custom: "Primary"}
      })
    })
  })

  it("calls cognitoSignIn with 'Mock' when the mock login button is clicked", async () => {
    // Get the mocked module
    const envModule = jest.requireMock("@/constants/environment")

    // Modify the environment config temporarily
    envModule.ENV_CONFIG = {
      ...envModule.ENV_CONFIG,
      TARGET_ENVIRONMENT: "qa"
    }
    renderWithProviders(<LoginPage />)

    const mockLogin = screen.getByRole("button", {
      name: /Log in with mock CIS2/i
    })
    await userEvent.click(mockLogin)

    await waitFor(() => {
      expect(mockCognitoSignIn).toHaveBeenCalledWith({
        provider: {custom: "Mock"}
      })
    })
  })

  it("calls cognitoSignOut when the sign out button is clicked", async () => {
    renderWithProviders(<LoginPage />, {
      ...defaultAuthState,
      isSignedIn: true,
      user: "testUser"
    })

    const signOutBtn = screen.getByRole("button", {name: /Sign Out/i})
    await userEvent.click(signOutBtn)

    await waitFor(() => {
      expect(mockCognitoSignOut).toHaveBeenCalled()
    })
  })

  it("shows a spinner when in prod environment", async () => {
    // Get the mocked module
    const envModule = jest.requireMock("@/constants/environment")

    // Modify the environment config temporarily
    envModule.ENV_CONFIG = {
      ...envModule.ENV_CONFIG,
      TARGET_ENVIRONMENT: "prod"
    }

    // Render the component with our providers
    const {container} = renderWithProviders(<LoginPage />, {
      ...defaultAuthState,
      isSignedIn: false,
      user: "testUser"
    })

    await waitFor(() => {
      expect(
        screen.getByText(/Redirecting to CIS2 login page/i)
      ).toBeInTheDocument()
    })

    const spinnerContainer = container.querySelector(".spinner-container")
    expect(spinnerContainer).toBeInTheDocument()
    expect(mockCognitoSignIn).toHaveBeenCalledWith({"provider": {"custom": "Primary"}}
    )
  })

  it("shows a spinner when in dev environment", async () => {
    // Get the mocked module
    const envModule = jest.requireMock("@/constants/environment")

    // Modify the environment config temporarily
    envModule.ENV_CONFIG = {
      ...envModule.ENV_CONFIG,
      TARGET_ENVIRONMENT: "dev"
    }

    // Render the component with our providers
    const {container} = renderWithProviders(<LoginPage />, {
      ...defaultAuthState,
      isSignedIn: false,
      user: "testUser"
    })

    await waitFor(() => {
      expect(
        screen.getByText(/Redirecting to CIS2 login page/i)
      ).toBeInTheDocument()
    })

    const spinnerContainer = container.querySelector(".spinner-container")
    expect(spinnerContainer).toBeInTheDocument()
    expect(mockCognitoSignIn).toHaveBeenCalledWith({"provider": {"custom": "Mock"}})
  })

})
