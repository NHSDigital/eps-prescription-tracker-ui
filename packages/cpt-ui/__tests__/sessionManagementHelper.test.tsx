import {jest} from "@jest/globals"
import {postSessionManagementUpdate} from "@/helpers/sessionManagement"
import {AuthContextType} from "@/context/AuthProvider"
import {logger} from "@/helpers/logger"

jest.mock("@/helpers/axios", () => ({
  __esModule: true,
  default: {
    post: jest.fn()
  }
}))

import http from "@/helpers/axios"
const mockedAxios = http as jest.Mocked<typeof http>

jest.mock("@/helpers/logger")

jest.unstable_mockModule("@/constants/environment", () => {
  return {
    API_ENDPOINTS: {
      SESSION_MANAGEMENT: "/api/session-management"
    }
  }
})

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

    const loggerInfoSpy = jest.spyOn(logger, "info")

    const result = await postSessionManagementUpdate(mockAuth, redirect)

    expect(mockedAxios.post).toHaveBeenCalledWith(expect.anything(), {
      action: "Set-Session"
    })
    expect(mockAuth.updateTrackerUserInfo).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalled()
    expect(loggerInfoSpy).toHaveBeenCalledWith("Session is now active.")
    expect(result).toBe(true)
    loggerInfoSpy.mockRestore()
  })

  it("returns false if response status is not Active", async () => {
    mockedAxios.post.mockResolvedValue({
      status: 202,
      data: {status: "Inactive"}
    })

    const result = await postSessionManagementUpdate(mockAuth, redirect)

    expect(mockAuth.updateTrackerUserInfo).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  it("throws error if response status code is not 202", async () => {
    mockedAxios.post.mockResolvedValue({
      status: 500,
      data: {status: "Active"}
    })

    const loggerErrorSpy = jest.spyOn(logger, "error")

    const result = await postSessionManagementUpdate(mockAuth, redirect)

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      "Error calling session management",
      expect.stringContaining("Server error")
    )
    expect(result).toBe(false)
    loggerErrorSpy.mockRestore()
  })

  it("handles http.post throwing an exception", async () => {
    mockedAxios.post.mockRejectedValue(new Error("Network error"))

    const loggerErrorSpy = jest.spyOn(logger, "error")

    const result = await postSessionManagementUpdate(mockAuth, redirect)

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      "Error calling session management",
      "Network error"
    )
    expect(result).toBe(false)
    loggerErrorSpy.mockRestore()
  })

  it("handles unexpected error types", async () => {
    mockedAxios.post.mockRejectedValue("Something went wrong")

    const loggerErrorSpy = jest.spyOn(logger, "error")

    const result = await postSessionManagementUpdate(mockAuth, redirect)

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      "Error calling session management",
      "Error calling session management"
    )
    expect(result).toBe(false)
    loggerErrorSpy.mockRestore()
  })
})
