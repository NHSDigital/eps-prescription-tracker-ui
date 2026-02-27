import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import React from "react"
import LogoutPage from "@/pages/LogoutPage"
import {AuthContext, type AuthContextType} from "@/context/AuthProvider"
import {AccessProvider} from "@/context/AccessProvider"

// Mock constants
jest.mock("@/constants/environment", () => ({
  FRONTEND_PATHS: {
    LOGIN: "/login",
    LOGOUT: "/logout",
    SELECT_YOUR_ROLE: "/select-your-role",
    SESSION_SELECTION: "/select-active-session",
    COOKIES: "/cookies",
    PRIVACY_NOTICE: "/privacy-notice",
    COOKIES_SELECTED: "/cookies-selected"
  },
  PUBLIC_PATHS: [
    "/login",
    "/logout",
    "/session-logged-out",
    "/cookies",
    "/privacy-notice",
    "/cookies-selected",
    "/notfound",
    "/"
  ],
  ALLOWED_NO_ROLE_PATHS: [
    "/login",
    "/logout",
    "/cookies",
    "/privacy-notice",
    "/cookies-selected",
    "/",
    "/select-active-session"
  ],
  AUTH_CONFIG: {
    USER_POOL_ID: "mock-pool-id",
    USER_POOL_CLIENT_ID: "mock-client-id",
    HOSTED_LOGIN_DOMAIN: "mock-domain",
    REDIRECT_SIGN_IN: "mock-signin",
    REDIRECT_SIGN_OUT: "mock-signout"
  },
  API_ENDPOINTS: {
    CIS2_SIGNOUT_ENDPOINT: "/api/cis2-signout"
  }
}))

// Mock utils
jest.mock("@/helpers/utils", () => ({
  normalizePath: jest.fn((path) => path)
}))

// Mock logger
jest.mock("@/helpers/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn()
  }
}))

// Create a mock AuthProvider component
const MockAuthProvider = ({
  children,
  defaultIsSignedIn = false
}: {
  children: React.ReactNode;
  defaultIsSignedIn: boolean;
}) => {
  const mockCognitoSignOut = jest.fn().mockResolvedValue(undefined)

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const authContextValue: AuthContextType = {
    error: null,
    user: defaultIsSignedIn ? {username: "testUser"} : null,
    isSignedIn: defaultIsSignedIn,
    isSigningIn: false,
    invalidSessionCause: undefined,
    rolesWithAccess: [],
    rolesWithoutAccess: [],
    selectedRole: undefined,
    userDetails: undefined,
    isConcurrentSession: false,
    sessionId: undefined,
    cognitoSignIn: jest.fn(),
    cognitoSignOut: mockCognitoSignOut,
    clearAuthState: jest.fn(),
    hasSingleRoleAccess: jest.fn().mockReturnValue(false),
    updateSelectedRole: jest.fn(),
    updateTrackerUserInfo: jest.fn(),
    updateInvalidSessionCause: jest.fn(),
    isSigningOut: false,
    setIsSigningOut: jest.fn()
  } as AuthContextType

  return (
    <MemoryRouter initialEntries={["/logout"]}>
      <AuthContext.Provider value={authContextValue}>
        <AccessProvider>{children}</AccessProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe("LogoutPage", () => {
  it("renders 'Logout successful' immediately if the user is not signed in", () => {
    render(
      <MockAuthProvider defaultIsSignedIn={false}>
        <LogoutPage />
      </MockAuthProvider>
    )

    expect(screen.getByText(/Logout successful/i)).toBeInTheDocument()
    expect(
      screen.getByText(
        /You are now logged out of the service. To continue using the service, you must log in again/i
      )
    ).toBeInTheDocument()
    expect(screen.getByRole("link", {name: /log in/i})).toBeInTheDocument()
  })

  it("shows a spinner and calls signOut when the user is signed in", async () => {
    render(
      <MockAuthProvider defaultIsSignedIn={true}>
        <LogoutPage />
      </MockAuthProvider>
    )

    expect(screen.getByText(/Logging out/i)).toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("does not call signOut if user is signed in, but we haven't advanced timers yet", () => {
    render(
      <MockAuthProvider defaultIsSignedIn={true}>
        <LogoutPage />
      </MockAuthProvider>
    )

    expect(screen.getByText(/Logging out/i)).toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
  })
})
