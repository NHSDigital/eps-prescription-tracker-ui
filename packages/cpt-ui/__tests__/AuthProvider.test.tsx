import React, {useContext} from "react"
import {
  render,
  waitFor,
  screen,
  act
} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"

import {Amplify} from "aws-amplify"
import {Hub} from "aws-amplify/utils"
import {signInWithRedirect, signOut} from "aws-amplify/auth"

import {AuthContext, AuthContextType, AuthProvider} from "@/context/AuthProvider"

import axios from "@/helpers/axios"
import {getTrackerUserInfo, updateRemoteSelectedRole} from "@/helpers/userInfo"
import {logger} from "@/helpers/logger"
jest.mock("@/helpers/axios")

const currentlySelectedRole = {
  role_id: "ROLE123",
  role_name: "Pharmacist",
  org_name: "Test Pharmacy Org",
  org_code: "ORG123",
  site_address: "1 Fake Street"
}
const rolesWithAccess = [
  {
    role_id: "ROLE123",
    role_name: "Pharmacist",
    org_name: "Test Pharmacy Org",
    org_code: "ORG123",
    site_address: "1 Fake Street"
  }
]
const userDetails = {
  family_name: "FAMILY",
  given_name: "GIVEN"
}
const mockUserInfo = {
  rolesWithAccess: rolesWithAccess,
  rolesWithoutAccess: [],
  selectedRole: currentlySelectedRole,
  userDetails: userDetails,
  error: undefined
}

jest.mock("@/helpers/userInfo", () => ({
  getTrackerUserInfo: jest.fn(),
  updateRemoteSelectedRole: jest.fn()
}))

// Mock constants
jest.mock("@/constants/environment", () => ({
  PUBLIC_PATHS: [
    "/login",
    "/logout",
    "/cookies",
    "/privacy-notice",
    "/cookies-selected",
    "/"
  ],
  FRONTEND_PATHS: {
    LOGIN: "/login",
    LOGOUT: "/logout",
    SELECT_YOUR_ROLE: "/select-your-role"
  },
  API_ENDPOINTS: {
    CIS2_SIGNOUT_ENDPOINT: "/api/cis2-signout"
  },
  AUTH_CONFIG: {
    USER_POOL_ID: "mock-pool-id",
    USER_POOL_CLIENT_ID: "mock-client-id",
    HOSTED_LOGIN_DOMAIN: "mock-domain",
    REDIRECT_SIGN_IN: "mock-signin",
    REDIRECT_SIGN_OUT: "mock-signout"
  },
  APP_CONFIG: {
    REACT_LOG_LEVEL: "info"
  }
}))

// Mock utils
jest.mock("@/helpers/utils", () => ({
  normalizePath: jest.fn((path) => path)
}))

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: jest.fn(() => ({pathname: "/"})),
  useNavigate: jest.fn(() => jest.fn())
}))

// Tell TypeScript that axios is a mocked version.
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock environment variables to mimic the real environment
// eslint-disable-next-line no-undef
process.env.VITE_userPoolId = "testUserPoolId"
// eslint-disable-next-line no-undef
process.env.VITE_userPoolClientId = "testUserPoolClientId"
// eslint-disable-next-line no-undef
process.env.VITE_hostedLoginDomain = "testDomain"
// eslint-disable-next-line no-undef
process.env.VITE_redirectSignIn = "http://localhost:3000"
// eslint-disable-next-line no-undef
process.env.VITE_redirectSignOut = "http://localhost:3000"

// Mock AWS Amplify functions to isolate AuthProvider logic
jest.mock("aws-amplify", () => ({
  Amplify: {
    configure: jest.fn() // Mock Amplify configuration
  }
}))

jest.mock("aws-amplify/auth", () => ({
  signInWithRedirect: jest.fn(), // Mock redirect sign-in
  signOut: jest.fn() // Mock sign-out
}))

jest.mock("aws-amplify/utils", () => ({
  Hub: {
    listen: jest.fn() // Mock Amplify Hub for event listening
  }
}))

// A helper component to consume the AuthContext and expose its values for testing
const TestConsumer = () => {
  const auth = useContext(AuthContext) // Access the AuthContext
  if (!auth) return null // Return nothing if context is not available

  // Render state values for testing
  return (
    <div>
      <div data-testid="error">{auth.error}</div>
      <div data-testid="user">{auth.user}</div>
      <div data-testid="authStatus">{auth.authStatus}</div>
      <div data-testid="isSignedIn">{auth.isSignedIn.toString()}</div>
      <div data-testid="isSigningIn">{auth.isSigningIn.toString()}</div>
      <div data-testid="rolesWithAccess">{JSON.stringify(auth.rolesWithAccess, null, 2)}</div>
      <div data-testid="rolesWithoutAccess">{JSON.stringify(auth.rolesWithoutAccess, null, 2)}</div>
      <div data-testid="selectedRole">{JSON.stringify(auth.selectedRole, null, 2)}</div>
      <div data-testid="userDetails">{JSON.stringify(auth.userDetails, null, 2)}</div>
    </div>
  )
}

// Test suite for AuthProvider
describe("AuthProvider", () => {
  // Variable to store the callback for Amplify Hub events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hubCallback: ((data: any) => void) | null = null

  type RenderWithProviderOptions = {
    // eslint-disable-next-line no-undef
    TestComponent?: JSX.Element;
  };

  const renderWithProvider = async ({
    TestComponent = <TestConsumer />
  }: RenderWithProviderOptions = {}) => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>{TestComponent}</AuthProvider>
        </MemoryRouter>
      )
    })
  }

  // Reset mocks before each test
  beforeEach(() => {
    jest.restoreAllMocks(); // Restore all mock implementations
    (Hub.listen as jest.Mock).mockImplementation((channel, callback) => {
      if (channel === "auth") {
        hubCallback = callback // Store the Hub callback
      }
      return () => { } // Mock unsubscribe function
    })

  })

  // Initialization and Configuration
  it("should configure Amplify on mount", async () => {
    // Verify Amplify.configure is called when the provider mounts
    await renderWithProvider()
    expect(Amplify.configure).toHaveBeenCalled()
  })

  // Session Handling
  it("should set isSignedIn to false at mount", async () => {
    // Render without valid tokens
    await renderWithProvider()
    await waitFor(() => {
      // Check that the signed-in state is false and user is null
      expect(screen.getByTestId("isSignedIn").textContent).toBe("false")
    })
  })

  // Error Handling

  it("should log an error if signOut fails", async () => {
    const loggerErrorSpy = jest.spyOn(logger, "error")
    const signOutError = new Error("Sign out failed");
    (signOut as jest.Mock).mockRejectedValue(signOutError as never)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contextValue: any
    const TestComponent = () => {
      contextValue = useContext(AuthContext)
      return null
    }

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </MemoryRouter>
      )
    })

    await act(async () => {
      await contextValue.cognitoSignOut()
    })

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      "Failed to sign out:",
      signOutError
    )
    loggerErrorSpy.mockRestore()
  })

  // Token Handling

  // Hub Events
  it("should handle Hub event signedIn", async () => {
    (getTrackerUserInfo as jest.Mock).mockResolvedValue(mockUserInfo)
    await renderWithProvider()
    // Ensure the Hub event listener (hubCallback) is initialized
    if (!hubCallback) {
      throw new Error("hubCallback is not initialized")
    }
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: {userInfo: mockUserInfo}
    })
    mockedAxios.put.mockResolvedValueOnce({
      status: 200
    })
    // Simulate the Hub event "signedIn"
    act(() => {
      // Simulate a successful Hub event for signedIn
      hubCallback!({payload: {event: "signedIn", data: {username: "test_user"}}})
    })

    await waitFor(() => {
      expect(screen.getByTestId("isSignedIn").textContent).toBe("true")
      expect(screen.getByTestId("user").textContent).toBe("test_user")
      expect(screen.getByTestId("rolesWithAccess").textContent).toBe(JSON.stringify(rolesWithAccess, null, 2))
      expect(screen.getByTestId("rolesWithoutAccess").textContent).toBe("[]")
      expect(screen.getByTestId("selectedRole").textContent).toBe(JSON.stringify(currentlySelectedRole, null, 2))
      expect(screen.getByTestId("userDetails").textContent).toBe(JSON.stringify(userDetails, null, 2))
    })
  })

  it("should handle Hub event signInWithRedirect_failure", async () => {
    // Render the AuthProvider with a TestConsumer to observe context changes
    await renderWithProvider()

    // Ensure the Hub event listener (hubCallback) is initialized
    if (!hubCallback) {
      throw new Error("hubCallback is not initialized")
    }

    // Simulate the Hub event "signInWithRedirect_failure"
    act(() => {
      hubCallback!({payload: {event: "signInWithRedirect_failure"}})
    })

    // Wait for the context state to update and verify changes
    await waitFor(() => {
      // Assert that an error is set after the Hub event failure
      expect(screen.getByTestId("error").textContent).toBe(
        "An error has occurred during the OAuth flow." // Error state is updated
      )
    })
  })

  it("should handle Hub event signedOut after a signedIn event", async () => {
    // Render the AuthProvider and capture the Hub callback
    await renderWithProvider()

    // Ensure the Hub event listener (hubCallback) is initialized
    if (!hubCallback) {
      throw new Error("hubCallback is not initialized")
    }

    // Simulate the Hub event "signedIn"
    act(() => {
      // Simulate a successful Hub event for signedIn
      hubCallback!({payload: {event: "signedIn", data: {username: "test_user"}}})
    })

    await waitFor(() => {
      expect(screen.getByTestId("isSignedIn").textContent).toBe("true")
      expect(screen.getByTestId("user").textContent).toBe("test_user")
    })
    // Simulate the 'signedOut' Hub event
    act(() => {
      hubCallback!({payload: {event: "signedOut"}})
    })

    // Verify that the context state is reset
    await waitFor(() => {
      expect(screen.getByTestId("isSignedIn").textContent).toBe("false")
      expect(screen.getByTestId("user").textContent).toBe("")
      expect(screen.getByTestId("error").textContent).toBe("")
      expect(screen.getByTestId("rolesWithAccess").textContent).toBe("[]")
      expect(screen.getByTestId("rolesWithoutAccess").textContent).toBe("[]")
      expect(screen.getByTestId("selectedRole").textContent).toBe("")
      expect(screen.getByTestId("userDetails").textContent).toBe("")
    })
  })

  // Auth Functions
  it("should provide cognitoSignIn functions", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contextValue: any
    const TestComponent = () => {
      contextValue = useContext(AuthContext)
      return null
    }

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </MemoryRouter>
      )
    })

    await act(async () => {
      await contextValue.cognitoSignIn()
    })
    expect(signInWithRedirect).toHaveBeenCalled()
    expect(contextValue.isSigningIn).toBe(true)
  })

  it("should provide cognitoSignOut functions", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contextValue: any
    const TestComponent = () => {
      contextValue = useContext(AuthContext)
      return null
    }

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </MemoryRouter>
      )
    })

    await act(async () => {
      await contextValue.cognitoSignOut()
    })
    expect(signOut).toHaveBeenCalled()
  })

  it(
    "should call updateRemoteSelectedRole and update selectedRole state when updateSelectedRole is called",
    async () => {
      const newRole = {
        role_id: "ROLE456",
        role_name: "Admin",
        org_name: "Admin Org",
        org_code: "ORG456",
        site_address: "456 Admin Street"
      };

      (updateRemoteSelectedRole as jest.Mock).mockResolvedValue({
        currentlySelectedRole: newRole
      })

      let contextValue: AuthContextType | null
      const TestComponent = () => {
        contextValue = useContext(AuthContext)
        return (
          <div>
            <div data-testid="selectedRole">
              {JSON.stringify(contextValue?.selectedRole, null, 2)}
            </div>
          </div>
        )
      }

      await act(async () => {
        render(
          <MemoryRouter>
            <AuthProvider>
              <TestComponent />
            </AuthProvider>
          </MemoryRouter>
        )
      })

      await act(async () => {
        await contextValue?.updateSelectedRole(newRole)
      })

      expect(updateRemoteSelectedRole).toHaveBeenCalledWith(newRole)

      await waitFor(() => {
        expect(screen.getByTestId("selectedRole").textContent).toBe(
          JSON.stringify(newRole, null, 2)
        )
      })
    })
})
