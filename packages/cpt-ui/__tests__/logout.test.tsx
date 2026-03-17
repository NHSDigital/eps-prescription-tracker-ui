import "@testing-library/jest-dom"
import {handleSignoutEvent, signOut} from "@/helpers/logout"
import {logger} from "@/helpers/logger"
import {AUTH_CONFIG, FRONTEND_PATHS} from "@/constants/environment"
import {AuthContextType} from "@/context/AuthProvider"
import {mockAuthState} from "./mocks/AuthStateMock"

// Mock logger
jest.mock("@/helpers/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
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

describe("logout helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe("signOut function", () => {
    it("calls setStateForSignOut and cognitoSignOut", async () => {
      const mockAuth: AuthContextType = {
        ...mockAuthState,
        cognitoSignOut: jest.fn().mockResolvedValue(true)
      }

      await signOut(mockAuth)

      expect(mockAuth.setStateForSignOut).toHaveBeenCalledTimes(1)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Called signOut helper from"), mockAuth
      )
    })

    it("uses provided redirectUri when specified", async () => {
      const mockAuth: AuthContextType = {
        ...mockAuthState,
        cognitoSignOut: jest.fn().mockResolvedValue(true)
      }
      const customRedirectUri = "/custom-redirect"

      await signOut(mockAuth, mockNavigate, customRedirectUri)

      expect(logger.info).toHaveBeenCalledWith(
        "Signing out with specified redirect path",
        customRedirectUri
      )
      expect(mockAuth.cognitoSignOut).toHaveBeenCalledWith(customRedirectUri)
    })

    it("handles cognitoSignOut errors and navigates to logout", async () => {
      const signOutError = new Error("Cognito signout failed")
      const mockAuth: AuthContextType = {
        ...mockAuthState,
        cognitoSignOut: jest.fn().mockRejectedValue(signOutError)
      }

      await signOut(mockAuth, mockNavigate, "/test-redirect")

      expect(logger.error).toHaveBeenCalledWith(
        "Error during sign out with specified redirect path: /test-redirect", signOutError
      )
      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.LOGOUT)
    })

    it("handles cognitoSignOut errors without redirect uri", async () => {
      const signOutError = new Error("Network error")
      const mockAuth: AuthContextType = {
        ...mockAuthState,
        cognitoSignOut: jest.fn().mockRejectedValue(signOutError)
      }

      await signOut(mockAuth, mockNavigate)

      expect(logger.error).toHaveBeenCalledWith(
        "Error during sign out", signOutError
      )
      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.LOGOUT)
    })
  })

  describe("handleSignoutEvent", () => {
    it("handles invalid session cause by updating cause and using session sign out", async () => {
      const mockAuth: AuthContextType = {
        ...mockAuthState,
        cognitoSignOut: jest.fn().mockResolvedValue(true)
      }
      const invalidSessionCause = "ConcurrentSession"

      await handleSignoutEvent(mockAuth, mockNavigate, "Reason", invalidSessionCause)

      expect(logger.info).toHaveBeenCalledWith(
        `Invalid session cause supplied, ${invalidSessionCause}`
      )
      expect(mockAuth.updateInvalidSessionCause).toHaveBeenCalledWith(invalidSessionCause)
      expect(logger.info).toHaveBeenCalledWith(
        "Handling sign out event with cause: Reason and invalid session reason: ConcurrentSession"
      )
      expect(mockAuth.cognitoSignOut).toHaveBeenCalledWith(AUTH_CONFIG.REDIRECT_SESSION_SIGN_OUT)
    })

    it("uses default sign out when no invalid session cause provided", async () => {
      const mockAuth: AuthContextType = {
        ...mockAuthState,
        cognitoSignOut: jest.fn().mockResolvedValue(true)
      }

      await handleSignoutEvent(mockAuth, mockNavigate, "Reason", undefined)

      expect(logger.info).toHaveBeenCalledWith(
        "No invalid session cause, using standard logout"
      )
      expect(mockAuth.updateInvalidSessionCause).not.toHaveBeenCalled()
      expect(mockAuth.cognitoSignOut).toHaveBeenCalledWith(AUTH_CONFIG.REDIRECT_SIGN_OUT)
    })

    it("uses default sign out when empty string invalid session cause provided", async () => {
      const mockAuth: AuthContextType = {
        ...mockAuthState,
        cognitoSignOut: jest.fn().mockResolvedValue(true)
      }

      await handleSignoutEvent(mockAuth, mockNavigate, "Reason")

      expect(logger.info).toHaveBeenCalledWith(
        "No invalid session cause, using standard logout"
      )
      expect(mockAuth.updateInvalidSessionCause).not.toHaveBeenCalled()
      expect(mockAuth.cognitoSignOut).toHaveBeenCalledWith(AUTH_CONFIG.REDIRECT_SIGN_OUT)
    })

    it("handles various invalid session cause values", async () => {
      const testCases = ["Timeout", "Expired", "InvalidToken", "ConcurrentSession"]

      for (const cause of testCases) {
        jest.clearAllMocks()
        localStorage.clear()
        const mockAuth: AuthContextType = {
          ...mockAuthState,
          cognitoSignOut: jest.fn().mockResolvedValue(true)
        }

        await handleSignoutEvent(mockAuth, mockNavigate, "Reason", cause)
        expect(mockAuth.updateInvalidSessionCause).toHaveBeenCalledWith(cause)
        expect(mockAuth.cognitoSignOut).toHaveBeenCalledWith(AUTH_CONFIG.REDIRECT_SESSION_SIGN_OUT)
      }
    })

    it("navigates to logout when signOut encounters an error", async () => {
      const mockAuth: AuthContextType = {
        ...mockAuthState,
        cognitoSignOut: jest.fn().mockRejectedValue(new Error("Sign out failed"))
      }

      await handleSignoutEvent(mockAuth, mockNavigate, "Reason", "Timeout")

      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.LOGOUT)
    })

    it("propagates errors from updateInvalidSessionCause", async () => {
      const mockAuth: AuthContextType = {
        ...mockAuthState,
        updateInvalidSessionCause: jest.fn().mockRejectedValue(new Error("Update failed"))
      }

      await expect(handleSignoutEvent(mockAuth, mockNavigate, "Reason", "Timeout"))
        .rejects.toThrow("Update failed")
    })
  })
})
