import "@testing-library/jest-dom"
import {signOut, handleRestartLogin} from "@/helpers/logout"
import {logger} from "@/helpers/logger"
import {AUTH_CONFIG} from "@/constants/environment"
import {AuthContextType} from "@/context/AuthProvider"

// Mock logger
jest.mock("@/helpers/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}))

// Mock AUTH_CONFIG
jest.mock("@/constants/environment", () => ({
  AUTH_CONFIG: {
    REDIRECT_SIGN_OUT: "/default-signout",
    REDIRECT_SESSION_SIGN_OUT: "/session-signout"
  }
}))

const createMockAuth = (overrides = {}): AuthContextType => ({
  error: null,
  user: null,
  isSignedIn: false,
  isSigningIn: false,
  isSigningOut: false,
  isConcurrentSession: false,
  invalidSessionCause: undefined,
  sessionId: undefined,
  deviceId: undefined,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  selectedRole: undefined,
  userDetails: undefined,
  remainingSessionTime: undefined,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn().mockResolvedValue(true),
  clearAuthState: jest.fn(),
  hasSingleRoleAccess: jest.fn().mockReturnValue(false),
  updateSelectedRole: jest.fn(),
  updateTrackerUserInfo: jest.fn(),
  updateInvalidSessionCause: jest.fn(),
  setIsSigningOut: jest.fn(),
  setStateForSignOut: jest.fn().mockResolvedValue(undefined),
  ...overrides
})

describe("logout helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("signOut", () => {
    it("calls setStateForSignOut and cognitoSignOut", async () => {
      const mockAuth = createMockAuth()

      await signOut(mockAuth)

      expect(mockAuth.setStateForSignOut).toHaveBeenCalledTimes(1)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Called signOut helper from")
      )
    })

    it("uses provided redirectUri when specified", async () => {
      const mockAuth = createMockAuth()
      const customRedirectUri = "/custom-redirect"

      await signOut(mockAuth, customRedirectUri)

      expect(logger.info).toHaveBeenCalledWith(
        "Signing out with specified redirect path",
        customRedirectUri
      )
      expect(mockAuth.cognitoSignOut).toHaveBeenCalledWith(customRedirectUri)
    })

    it("uses default redirectUri when not specified", async () => {
      const mockAuth = createMockAuth()

      await signOut(mockAuth)

      expect(logger.info).toHaveBeenCalledWith(
        "Signing out with default redirect path",
        AUTH_CONFIG.REDIRECT_SIGN_OUT
      )
      expect(mockAuth.cognitoSignOut).toHaveBeenCalledWith(AUTH_CONFIG.REDIRECT_SIGN_OUT)
    })

    it("handles cognitoSignOut errors and sets isSigningOut to false", async () => {
      const signOutError = new Error("Cognito signout failed")
      const mockAuth = createMockAuth({
        cognitoSignOut: jest.fn().mockRejectedValue(signOutError)
      })

      await expect(signOut(mockAuth, "/test-redirect")).rejects.toThrow("Cognito signout failed")

      expect(logger.error).toHaveBeenCalledWith("Error during logout:", signOutError)
      expect(mockAuth.setIsSigningOut).toHaveBeenCalledWith(false)
    })

    it("re-throws the error after handling it", async () => {
      const signOutError = new Error("Network error")
      const mockAuth = createMockAuth({
        cognitoSignOut: jest.fn().mockRejectedValue(signOutError)
      })

      await expect(signOut(mockAuth)).rejects.toThrow("Network error")
    })

    it("handles null cognitoSignOut gracefully", async () => {
      const mockAuth = createMockAuth({
        cognitoSignOut: null
      })

      // Should log but not throw error due to optional chaining
      await expect(signOut(mockAuth)).rejects.toThrow("is not a function")
    })

    it("handles undefined cognitoSignOut gracefully", async () => {
      const mockAuth = createMockAuth({
        cognitoSignOut: undefined
      })

      await expect(signOut(mockAuth)).rejects.toThrow("is not a function")
    })
  })

  describe("handleRestartLogin", () => {
    it("logs the restart login initiation and AUTH_CONFIG values", async () => {
      const mockAuth = createMockAuth()
      const invalidSessionCause = "Timeout"

      await handleRestartLogin(mockAuth, invalidSessionCause)

      expect(logger.info).toHaveBeenCalledWith(
        "Handling restart login instruction from backend",
        invalidSessionCause
      )
      expect(logger.info).toHaveBeenCalledWith("AUTH_CONFIG values:", {
        REDIRECT_SIGN_OUT: AUTH_CONFIG.REDIRECT_SIGN_OUT,
        REDIRECT_SESSION_SIGN_OUT: AUTH_CONFIG.REDIRECT_SESSION_SIGN_OUT
      })
    })

    it("handles invalid session cause by updating cause and using session sign out", async () => {
      const mockAuth = createMockAuth()
      const invalidSessionCause = "ConcurrentSession"

      await handleRestartLogin(mockAuth, invalidSessionCause)

      expect(logger.info).toHaveBeenCalledWith(
        `Invalid session cause supplied, ${invalidSessionCause}`
      )
      expect(mockAuth.updateInvalidSessionCause).toHaveBeenCalledWith(invalidSessionCause)
      expect(logger.info).toHaveBeenCalledWith(
        "About to sign out with REDIRECT_SESSION_SIGN_OUT:",
        AUTH_CONFIG.REDIRECT_SESSION_SIGN_OUT
      )
      expect(mockAuth.cognitoSignOut).toHaveBeenCalledWith(AUTH_CONFIG.REDIRECT_SESSION_SIGN_OUT)
    })

    it("uses default sign out when no invalid session cause provided", async () => {
      const mockAuth = createMockAuth()

      await handleRestartLogin(mockAuth, undefined)

      expect(logger.info).toHaveBeenCalledWith(
        "No invalid session cause, using REDIRECT_SIGN_OUT:",
        AUTH_CONFIG.REDIRECT_SIGN_OUT
      )
      expect(mockAuth.updateInvalidSessionCause).not.toHaveBeenCalled()
      expect(mockAuth.cognitoSignOut).toHaveBeenCalledWith(AUTH_CONFIG.REDIRECT_SIGN_OUT)
    })

    it("uses default sign out when empty string invalid session cause provided", async () => {
      const mockAuth = createMockAuth()

      await handleRestartLogin(mockAuth, "")

      expect(logger.info).toHaveBeenCalledWith(
        "No invalid session cause, using REDIRECT_SIGN_OUT:",
        AUTH_CONFIG.REDIRECT_SIGN_OUT
      )
      expect(mockAuth.updateInvalidSessionCause).not.toHaveBeenCalled()
      expect(mockAuth.cognitoSignOut).toHaveBeenCalledWith(AUTH_CONFIG.REDIRECT_SIGN_OUT)
    })

    it("handles various invalid session cause values", async () => {
      const mockAuth = createMockAuth()
      const testCases = ["Timeout", "Expired", "InvalidToken", "ConcurrentSession"]

      for (const cause of testCases) {
        jest.clearAllMocks()

        await handleRestartLogin(mockAuth, cause)
        expect(mockAuth.updateInvalidSessionCause).toHaveBeenCalledWith(cause)
        expect(mockAuth.cognitoSignOut).toHaveBeenCalledWith(AUTH_CONFIG.REDIRECT_SESSION_SIGN_OUT)
      }
    })

    it("propagates errors from signOut function", async () => {
      const mockAuth = createMockAuth({
        cognitoSignOut: jest.fn().mockRejectedValue(new Error("Sign out failed"))
      })

      await expect(handleRestartLogin(mockAuth, "Timeout"))
        .rejects.toThrow("Sign out failed")
    })

    it("propagates errors from updateInvalidSessionCause", async () => {
      const mockAuth = createMockAuth({
        updateInvalidSessionCause: jest.fn().mockRejectedValue(new Error("Update failed"))
      })
      await expect(handleRestartLogin(mockAuth, "Timeout"))
        .rejects.toThrow("Update failed")
    })
  })
})
