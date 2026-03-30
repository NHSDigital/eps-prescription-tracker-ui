import {AUTH_CONFIG} from "@/constants/environment"
import {handleSignIn, getHomeLink} from "@/helpers/loginFunctions"
import {logger} from "@/helpers/logger"
import {checkForRecentLogoutMarker, signOut} from "@/helpers/logout"
import {mockAuthState} from "./mocks/AuthStateMock"

jest.mock("@/helpers/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock("@/helpers/logout", () => ({
  signOut: jest.fn(),
  checkForRecentLogoutMarker: jest.fn()
}))

describe("getHomeLink", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns /login when user is not logged in", () => {
    expect(getHomeLink(false)).toBe("/login")
  })

  it("returns /search-by-prescription-id when user is logged in", () => {
    expect(getHomeLink(true)).toBe("/search-by-prescription-id")
  })
})

describe("handleSignIn", () => {
  const mockNavigate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(checkForRecentLogoutMarker as jest.Mock).mockReturnValue(undefined)
  })

  it("sets sign in state and calls cognitoSignIn for Primary", async () => {
    const mockAuth = {
      ...mockAuthState,
      cognitoSignIn: jest.fn().mockResolvedValue(undefined)
    }

    await handleSignIn(mockAuth, "Primary", mockNavigate)

    expect(mockAuth.setStateForSignIn).toHaveBeenCalledTimes(1)
    expect(mockAuth.cognitoSignIn).toHaveBeenCalledWith({
      provider: {
        custom: "Primary"
      }
    })
    expect(signOut).not.toHaveBeenCalled()
  })

  it("calls cognitoSignIn for Mock", async () => {
    const mockAuth = {
      ...mockAuthState,
      cognitoSignIn: jest.fn().mockResolvedValue(undefined)
    }

    await handleSignIn(mockAuth, "Mock", mockNavigate)

    expect(mockAuth.cognitoSignIn).toHaveBeenCalledWith({
      provider: {
        custom: "Mock"
      }
    })
  })

  it("signs out when already authenticated error is thrown", async () => {
    const alreadyAuthenticatedError = {name: "UserAlreadyAuthenticatedException"}
    const mockAuth = {
      ...mockAuthState,
      cognitoSignIn: jest.fn().mockRejectedValue(alreadyAuthenticatedError)
    }

    await handleSignIn(mockAuth, "Primary", mockNavigate)

    expect(signOut).toHaveBeenCalledWith(
      mockAuth,
      mockNavigate,
      AUTH_CONFIG.REDIRECT_SIGN_OUT,
      true
    )
    expect(logger.error).toHaveBeenCalledWith(
      "Error during Primary sign in:",
      alreadyAuthenticatedError
    )
  })

  it("does not sign out for non-authenticated errors", async () => {
    const unknownError = new Error("Unknown sign in failure")
    const mockAuth = {
      ...mockAuthState,
      cognitoSignIn: jest.fn().mockRejectedValue(unknownError)
    }

    await handleSignIn(mockAuth, "Mock", mockNavigate)

    expect(signOut).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith("Error during Mock sign in:", unknownError)
  })

  it("logs when a recent logout marker exists and still signs in", async () => {
    ;(checkForRecentLogoutMarker as jest.Mock).mockReturnValue({
      timestamp: Date.now(),
      reason: "signOut",
      initiatedByTabId: "tab-1"
    })
    const mockAuth = {
      ...mockAuthState,
      cognitoSignIn: jest.fn().mockResolvedValue(undefined)
    }

    await handleSignIn(mockAuth, "Primary", mockNavigate)

    expect(logger.info).toHaveBeenCalledWith("Attempting to sign-out, prohibit sign as well")
    expect(mockAuth.setStateForSignIn).toHaveBeenCalledTimes(1)
    expect(mockAuth.cognitoSignIn).toHaveBeenCalledWith({
      provider: {
        custom: "Primary"
      }
    })
  })
})
