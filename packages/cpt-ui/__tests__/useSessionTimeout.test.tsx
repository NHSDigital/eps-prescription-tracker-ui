import {renderHook, act} from "@testing-library/react"
import {useSessionTimeout} from "@/hooks/useSessionTimeout"
import {updateRemoteSelectedRole} from "@/helpers/userInfo"
import {signOut} from "@/helpers/logout"
import {logger} from "@/helpers/logger"
import {useAuth, AuthContextType} from "@/context/AuthProvider"

// Create mock implementations
const mockUpdateRemoteSelectedRole = jest.fn()
const mockSignOut = jest.fn()
const mockUpdateTrackerUserInfo = jest.fn()
const mockUpdateInvalidSessionCause = jest.fn()
const mockLogger = {
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
}

// Mock modules using factory functions to avoid hoisting issues
jest.mock("@/helpers/userInfo")
jest.mock("@/helpers/logout")
jest.mock("@/helpers/logger")
jest.mock("@/context/AuthProvider")
jest.mock("@/constants/environment", () => ({
  AUTH_CONFIG: {
    REDIRECT_SIGN_OUT: "mock-redirect-url",
    REDIRECT_SESSION_SIGN_OUT: "mock-session-redirect-url"
  }
}))

describe("useSessionTimeout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Configure mocks using jest.mocked
    jest.mocked(updateRemoteSelectedRole).mockImplementation(mockUpdateRemoteSelectedRole)
    jest.mocked(signOut).mockImplementation(mockSignOut)
    jest.mocked(logger).warn = mockLogger.warn
    jest.mocked(logger).info = mockLogger.info
    jest.mocked(logger).error = mockLogger.error

    const authContextMock: Partial<AuthContextType> = {
      selectedRole: {role_id: "123", org_code: "ABC", role_name: "Test Role"},
      updateTrackerUserInfo: mockUpdateTrackerUserInfo,
      updateInvalidSessionCause: mockUpdateInvalidSessionCause
    }
    jest.mocked(useAuth).mockReturnValue(authContextMock)

    // Set up default mock behaviors
    mockUpdateRemoteSelectedRole.mockResolvedValue({currentlySelectedRole: {}})
    mockSignOut.mockResolvedValue(undefined)
    mockUpdateTrackerUserInfo.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("should initialize with show false and remaining time 60", () => {
    const {result} = renderHook(() => useSessionTimeout())

    expect(result.current.showModal).toBe(false)
    // Internal timeLeft is in seconds, converted to ms when props provided
    expect(result.current.timeLeft).toBe(60)
  })

  it("should use props values when provided - props mode", () => {
    const {result} = renderHook(() => useSessionTimeout({
      showModal: true,
      timeLeft: 30, // Props timeLeft is used directly when provided
      onStayLoggedIn: jest.fn(),
      onLogOut: jest.fn()
    }))

    expect(result.current.showModal).toBe(true)
    expect(result.current.timeLeft).toBeGreaterThanOrEqual(0)
  })

  it("should call onStayLoggedIn from props when provided", async () => {
    const onStayLoggedIn = jest.fn().mockResolvedValue(undefined)
    const onLogOut = jest.fn().mockResolvedValue(undefined)
    const {result} = renderHook(() => useSessionTimeout({
      showModal: true,
      timeLeft: 30,
      onStayLoggedIn,
      onLogOut
    }))

    await act(async () => {
      await result.current.onStayLoggedIn()
    })

    expect(onStayLoggedIn).toHaveBeenCalled()
  })

  it("should handle onStayLoggedIn error and trigger logout", async () => {
    const onStayLoggedIn = jest.fn().mockRejectedValue(new Error("Test error"))
    const onLogOut = jest.fn().mockResolvedValue(undefined)
    const {result} = renderHook(() => useSessionTimeout({
      showModal: true,
      timeLeft: 30,
      onStayLoggedIn,
      onLogOut
    }))

    await act(async () => {
      await result.current.onStayLoggedIn()
    })

    expect(onStayLoggedIn).toHaveBeenCalled()
    expect(onLogOut).toHaveBeenCalled()
  })

  it("should handle stay logged in without props - successful scenario", async () => {
    const {result} = renderHook(() => useSessionTimeout())

    await act(async () => {
      await result.current.onStayLoggedIn()
    })

    expect(mockLogger.info).toHaveBeenCalledWith("User chose to extend session")
    expect(jest.mocked(updateRemoteSelectedRole)).toHaveBeenCalledWith({
      role_id: "123",
      org_code: "ABC",
      role_name: "Test Role"
    })
    expect(mockLogger.info).toHaveBeenCalledWith("Session extended successfully via selectedRole API")
    expect(jest.mocked(useAuth)().updateTrackerUserInfo).toHaveBeenCalled()
  })

  it("should handle stay logged in with error in updateRemoteSelectedRole", async () => {
    jest.mocked(updateRemoteSelectedRole).mockRejectedValue(new Error("API Error"))

    const {result} = renderHook(() => useSessionTimeout())

    await act(async () => {
      await result.current.onStayLoggedIn()
    })

    expect(mockLogger.error).toHaveBeenCalledWith("Error extending session:", expect.any(Error))
    expect(jest.mocked(signOut)).toHaveBeenCalledWith(
      expect.any(Object),
      "mock-redirect-url"
    )
  })

  it("should handle manual logout", async () => {
    const {result} = renderHook(() => useSessionTimeout())

    await act(async () => {
      await result.current.onLogOut()
    })

    expect(mockLogger.info).toHaveBeenCalledWith("User chose to log out from session timeout modal")
    expect(jest.mocked(signOut)).toHaveBeenCalledWith(
      expect.any(Object),
      "mock-redirect-url"
    )
  })

  it("should handle error when selectedRole is missing", async () => {
    const authContextMock: Partial<AuthContextType> = {
      selectedRole: null,
      updateTrackerUserInfo: mockUpdateTrackerUserInfo,
      updateInvalidSessionCause: mockUpdateInvalidSessionCause
    }
    jest.mocked(useAuth).mockReturnValue(authContextMock)

    const {result} = renderHook(() => useSessionTimeout())

    await act(async () => {
      await result.current.onStayLoggedIn()
    })

    expect(mockLogger.error).toHaveBeenCalledWith("No selected role available to extend session")
    expect(jest.mocked(signOut)).toHaveBeenCalledWith(
      expect.any(Object),
      "mock-redirect-url"
    )
  })

  it("should initialize with default values", () => {
    const {result} = renderHook(() => useSessionTimeout())

    expect(result.current.showModal).toBe(false)
    expect(result.current.timeLeft).toBe(60) // Internal state is in seconds, converted to ms when returned
    expect(result.current.isExtending).toBe(false)
    expect(typeof result.current.onStayLoggedIn).toBe("function")
    expect(typeof result.current.onLogOut).toBe("function")
    expect(typeof result.current.resetSessionTimeout).toBe("function")
  })
})
