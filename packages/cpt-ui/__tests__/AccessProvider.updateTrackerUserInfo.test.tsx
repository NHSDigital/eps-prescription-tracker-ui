import React, {useContext} from "react"
import {render, waitFor, act} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"

import {AuthContext, AuthProvider} from "@/context/AuthProvider"
import {getTrackerUserInfo} from "@/helpers/userInfo"

// Mock the external dependencies that AuthProvider needs
jest.mock("aws-amplify", () => ({
  Amplify: {
    configure: jest.fn()
  }
}))

jest.mock("aws-amplify/auth", () => ({
  signInWithRedirect: jest.fn(),
  signOut: jest.fn()
}))

jest.mock("aws-amplify/utils", () => ({
  Hub: {
    listen: jest.fn(() => () => {}) // Return unsubscribe function
  }
}))

jest.mock("@/helpers/userInfo", () => ({
  getTrackerUserInfo: jest.fn(),
  updateRemoteSelectedRole: jest.fn()
}))

jest.mock("@/constants/environment", () => ({
  PUBLIC_PATHS: ["/login"],
  FRONTEND_PATHS: {
    LOGIN: "/login"
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

jest.mock("@/helpers/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}))

describe("updateTrackerUserInfo", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => null)
    Storage.prototype.setItem = jest.fn()
  })

  it("does not update role/user state if there is an error", async () => {
    const testObject = {
      error: "Some error",
      rolesWithAccess: [{name: "Role1"}],
      rolesWithoutAccess: [{name: "Role2"}],
      selectedRole: {name: "Role1"},
      userDetails: {username: "testuser"},
      isConcurrentSession: false,
      sessionId: "session123",
      invalidSessionCause: undefined
    }

    // Mock getTrackerUserInfo to return an error response
    ;(getTrackerUserInfo as jest.Mock).mockResolvedValue(testObject)

    // Create a test component that captures the context value
    let contextValue: typeof AuthContext extends React.Context<infer T> ? T : never

    const TestComponent = () => {
      contextValue = useContext(AuthContext)
      return null
    }

    // Act: Render the provider with our test component
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </MemoryRouter>
      )
    })

    // Call the function we're testing
    await act(async () => {
      await contextValue!.updateTrackerUserInfo()
    })

    // Assert: Verify that role/user details were NOT set (because of error)
    await waitFor(() => {
      expect(contextValue!.rolesWithAccess).toEqual([])
      expect(contextValue!.rolesWithoutAccess).toEqual([])
      expect(contextValue!.selectedRole).toBeUndefined()
      expect(contextValue!.userDetails).toBeUndefined()
    })

    // Assert: Verify that session info WAS set (even with error)
    await waitFor(() => {
      expect(contextValue!.isConcurrentSession).toBe(testObject.isConcurrentSession)
      expect(contextValue!.sessionId).toBe(testObject.sessionId)
      expect(contextValue!.error).toBe(testObject.error)
      expect(contextValue!.invalidSessionCause).toBe(testObject.invalidSessionCause)
    })
  })

  it("updates all state when there is no error", async () => {
    // Arrange: Set up test data WITHOUT an error
    const testObject = {
      error: null,
      rolesWithAccess: [{name: "Role1"}],
      rolesWithoutAccess: [{name: "Role2"}],
      selectedRole: {name: "Role1"},
      userDetails: {username: "testuser"},
      isConcurrentSession: true,
      sessionId: "session456",
      invalidSessionCause: undefined
    }

    ;(getTrackerUserInfo as jest.Mock).mockResolvedValue(testObject)

    let contextValue: typeof AuthContext extends React.Context<infer T> ? T : never

    const TestComponent = () => {
      contextValue = useContext(AuthContext)
      return null
    }

    // Act
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
      await contextValue!.updateTrackerUserInfo()
    })

    // Assert: ALL state should be set when there's no error
    await waitFor(() => {
      expect(contextValue!.rolesWithAccess).toEqual(testObject.rolesWithAccess)
      expect(contextValue!.rolesWithoutAccess).toEqual(testObject.rolesWithoutAccess)
      expect(contextValue!.selectedRole).toEqual(testObject.selectedRole)
      expect(contextValue!.userDetails).toEqual(testObject.userDetails)
      expect(contextValue!.isConcurrentSession).toBe(testObject.isConcurrentSession)
      expect(contextValue!.sessionId).toBe(testObject.sessionId)
      expect(contextValue!.error).toBe(testObject.error)
      expect(contextValue!.invalidSessionCause).toBe(testObject.invalidSessionCause)
    })
  })
})
