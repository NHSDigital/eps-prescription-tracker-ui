import {postSessionManagementUpdate} from "@/helpers/sessionManagement"
import {AuthContextType} from "@/context/AuthProvider"
import axios from "@/helpers/axios"
import {logger} from "@/helpers/logger"

jest.mock("@/helpers/axios")
const mockedAxios = axios as jest.Mocked<typeof axios>

jest.mock("@/helpers/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}))

jest.mock("@/constants/environment", () => ({
  API_ENDPOINTS: {
    SESSION_MANAGEMENT: "/api/session-management"
  },
  AUTH_CONFIG: {
    USER_POOL_ID: "mock-pool-id",
    USER_POOL_CLIENT_ID: "mock-client-id",
    HOSTED_LOGIN_DOMAIN: "mock-domain",
    REDIRECT_SIGN_IN: "mock-signin",
    REDIRECT_SIGN_OUT: "mock-signout"
  }
}))

describe("postSessionManagementUpdate", () => {
  let mockAuth: jest.Mocked<AuthContextType>
  let redirect: jest.Mock

  beforeEach(() => {
    mockAuth = {
      updateTrackerUserInfo: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<AuthContextType>

    redirect = jest.fn()
    jest.clearAllMocks()
  })

  it("returns true and updates tracker info when session becomes active", async () => {
    mockedAxios.post.mockResolvedValue({
      status: 202,
      data: {status: "Active"}
    })

    const result = await postSessionManagementUpdate(mockAuth)

    expect(mockedAxios.post).toHaveBeenCalledWith("/api/session-management", {
      action: "Set-Session"
    })

    expect(logger.info).toHaveBeenCalledWith("Session is now active.")
    expect(logger.info).toHaveBeenCalledWith("Updated tracker info")
    expect(mockAuth.updateTrackerUserInfo).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it("returns false if response status is not Active", async () => {
    mockedAxios.post.mockResolvedValue({
      status: 202,
      data: {status: "Inactive"}
    })

    const result = await postSessionManagementUpdate(mockAuth)

    expect(mockedAxios.post).toHaveBeenCalledWith("/api/session-management", {
      action: "Set-Session"
    })

    expect(mockAuth.updateTrackerUserInfo).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  it("throws error if response status code is not 202", async () => {
    mockedAxios.post.mockResolvedValue({
      status: 500,
      data: {status: "Active"}
    })

    const result = await postSessionManagementUpdate(mockAuth)

    expect(mockedAxios.post).toHaveBeenCalledWith("/api/session-management", {
      action: "Set-Session"
    })

    expect(logger.error).toHaveBeenCalledWith(
      "Error calling session management or updating user info",
      {"data": {"status": "Active"}, "status": 500}
    )
    expect(mockAuth.updateTrackerUserInfo).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  it("handles http.post throwing an exception", async () => {
    const error = new Error("Network error")
    mockedAxios.post.mockRejectedValue(error)

    const result = await postSessionManagementUpdate(mockAuth)

    expect(mockedAxios.post).toHaveBeenCalledWith("/api/session-management", {
      action: "Set-Session"
    })
    expect(logger.error).toHaveBeenCalledWith("Error calling session management or updating user info", error)
    expect(mockAuth.updateTrackerUserInfo).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  it("handles unexpected error types", async () => {
    mockedAxios.post.mockRejectedValue("Something went wrong")

    const result = await postSessionManagementUpdate(mockAuth)

    expect(mockedAxios.post).toHaveBeenCalledWith("/api/session-management", {
      action: "Set-Session"
    })
    expect(logger.error).toHaveBeenCalledWith(
      "Error calling session management or updating user info",
      "Something went wrong"
    )
    expect(mockAuth.updateTrackerUserInfo).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  it("handles error when updateTrackerUserInfo fails", async () => {
    mockedAxios.post.mockResolvedValue({
      status: 202,
      data: {status: "Active"}
    })
    const error = new Error("Update failed")
    mockAuth.updateTrackerUserInfo.mockRejectedValue(error)

    const result = await postSessionManagementUpdate(mockAuth)

    expect(mockedAxios.post).toHaveBeenCalledWith("/api/session-management", {
      action: "Set-Session"
    })

    expect(logger.info).toHaveBeenCalledWith("Session is now active.")
    expect(mockAuth.updateTrackerUserInfo).toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith("Error calling session management or updating user info", error)
    expect(redirect).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })
})
