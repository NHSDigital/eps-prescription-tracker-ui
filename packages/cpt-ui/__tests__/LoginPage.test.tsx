import "@testing-library/jest-dom"
import {render, screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React, {useState} from "react"
import {BrowserRouter} from "react-router-dom"
import {AuthContext, type AuthContextType} from "@/context/AuthProvider"
import type {SignInWithRedirectInput, AuthUser, JWT} from "@aws-amplify/auth"
import LoginPage from "@/pages/LoginPage"

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
  MOCK_AUTH_ALLOWED_ENVIRONMENTS: ["dev", "dev-pr", "int", "qa"],
  API_ENDPOINTS: {
    TRACKER_USER_INFO: "/api/tracker-user-info",
    SELECTED_ROLE: "/api/selected-role"
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
  user: null,
  error: null,
  idToken: null,
  accessToken: null,
  cognitoSignIn: mockCognitoSignIn,
  cognitoSignOut: mockCognitoSignOut
}

const MockAuthProvider = ({
  children,
  initialState = defaultAuthState
}: {
  children: React.ReactNode;
  initialState?: AuthContextType;
}) => {
  const [authState, setAuthState] = useState<AuthContextType>({
    ...initialState,
    cognitoSignIn: async (input?: SignInWithRedirectInput) => {
      mockCognitoSignIn(input)
      // Simulate a sign-in update
      setAuthState((prev) => ({
        ...prev,
        isSignedIn: true,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        user: {
          username:
            (input?.provider as { custom: string })?.custom || "mockUser",
          userId: "mock-user-id"
        } as AuthUser,
        error: null,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        idToken: {toString: () => "mockIdToken"} as JWT,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        accessToken: {toString: () => "mockAccessToken"} as JWT
      }))
    },
    cognitoSignOut: async () => {
      mockCognitoSignOut()
      setAuthState((prev) => ({
        ...prev,
        isSignedIn: false,
        user: null,
        error: null,
        idToken: null,
        accessToken: null
      }))
    }
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
      <BrowserRouter>{component}</BrowserRouter>
    </MockAuthProvider>
  )
}

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the page and the main buttons", () => {
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
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      user: {username: "testUser"} as AuthUser,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      idToken: {toString: () => "mockIdToken"} as JWT,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      accessToken: {toString: () => "mockAccessToken"} as JWT
    })

    const signOutBtn = screen.getByRole("button", {name: /Sign Out/i})
    await userEvent.click(signOutBtn)

    await waitFor(() => {
      expect(mockCognitoSignOut).toHaveBeenCalled()
    })
  })

  it("shows a spinner when not in a mock auth environment", async () => {
    // Get the mocked module
    const envModule = jest.requireMock("@/constants/environment")

    // Modify the environment config temporarily
    envModule.ENV_CONFIG = {
      ...envModule.ENV_CONFIG,
      TARGET_ENVIRONMENT: "prod"
    }

    // Render the component with our providers
    const {container} = renderWithProviders(<LoginPage />)

    await waitFor(() => {
      expect(
        screen.getByText(/Redirecting to CIS2 login page/i)
      ).toBeInTheDocument()
    })

    const spinnerContainer = container.querySelector(".spinner-container")
    expect(spinnerContainer).toBeInTheDocument()
  })
})
