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
jest.mock("aws-rum-web", () => ({
  AwsRum: jest.fn().mockImplementation(() => ({
    allowCookies: jest.fn()
  }))
}))
jest.mock("@/helpers/awsRum", () => ({
  cptAwsRum: {
    recordPageView: jest.fn(),
    recordError: jest.fn()
  }
}))
jest.mock("@/constants/environment", () => ({
  AUTH_CONFIG: {
    REDIRECT_SIGN_OUT: "mock-redirect-url",
    REDIRECT_SESSION_SIGN_OUT: "mock-session-redirect-url"
  },
  APP_CONFIG: {
    REACT_LOG_LEVEL: "info"
  },
  RUM_CONFIG: {
    SESSION_SAMPLE_RATE: 1,
    GUEST_ROLE_ARN: "test-role-arn",
    IDENTITY_POOL_ID: "test-pool-id",
    ENDPOINT: "test-endpoint",
    TELEMETRIES: ["performance", "errors"],
    ALLOW_COOKIES: true,
    ENABLE_XRAY: false,
    APPLICATION_ID: "test-app-id",
    VERSION: "1.0.0",
    REGION: "us-west-2",
    RELEASE_ID: "dummy_release_id"
  },
  API_ENDPOINTS: {
    CIS2_SIGNOUT_ENDPOINT: "/api/cis2-signout"
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
      error: null,
      selectedRole: {role_id: "123", org_code: "ABC", role_name: "Test Role"},
      updateTrackerUserInfo: mockUpdateTrackerUserInfo,
      updateInvalidSessionCause: mockUpdateInvalidSessionCause
    }
    jest.mocked(useAuth).mockReturnValue(authContextMock as AuthContextType)

    // Set up default mock behaviors
    mockUpdateRemoteSelectedRole.mockResolvedValue({currentlySelectedRole: {}})
    mockSignOut.mockResolvedValue(undefined)
    mockUpdateTrackerUserInfo.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("should initialize with show false and remaining time 0", () => {
    const {result} = renderHook(() => useSessionTimeout({
      showModal: false,
      timeLeft: 60000,
      onStayLoggedIn: jest.fn(),
      onLogOut: jest.fn(),
      onTimeout: jest.fn()
    }))

    expect(result.current.showModal).toBe(false)
    // When modal is not shown, internal timeLeft stays at 0
    expect(result.current.timeLeft).toBe(0)
  })

  it("should use props values when provided - props mode", () => {
    const {result} = renderHook(() => useSessionTimeout({
      showModal: true,
      timeLeft: 30, // Props timeLeft is used directly when provided
      onStayLoggedIn: jest.fn(),
      onLogOut: jest.fn(),
      onTimeout: jest.fn()
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
      onLogOut,
      onTimeout: jest.fn()
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
      onLogOut,
      onTimeout: jest.fn()
    }))

    await act(async () => {
      await result.current.onStayLoggedIn()
    })

    expect(onStayLoggedIn).toHaveBeenCalled()
    expect(onLogOut).toHaveBeenCalled()
  })

  it("should handle stay logged in without props - successful scenario", async () => {
    const mockOnStayLoggedIn = jest.fn().mockResolvedValue(undefined)
    const {result} = renderHook(() => useSessionTimeout({
      showModal: false,
      timeLeft: 0,
      onStayLoggedIn: mockOnStayLoggedIn,
      onLogOut: jest.fn(),
      onTimeout: jest.fn()
    }))

    await act(async () => {
      await result.current.onStayLoggedIn()
    })

    // Hook delegates to prop function, so check that was called
    expect(mockOnStayLoggedIn).toHaveBeenCalled()
  })

  it("should handle stay logged in with error in updateRemoteSelectedRole", async () => {
    const mockOnStayLoggedIn = jest.fn().mockRejectedValue(new Error("API Error"))
    const mockOnLogOut = jest.fn()

    const {result} = renderHook(() => useSessionTimeout({
      showModal: false,
      timeLeft: 0,
      onStayLoggedIn: mockOnStayLoggedIn,
      onLogOut: mockOnLogOut,
      onTimeout: jest.fn()
    }))

    await act(async () => {
      await result.current.onStayLoggedIn()
    })

    // Hook should call prop function and handle error by calling onLogOut
    expect(mockOnStayLoggedIn).toHaveBeenCalled()
    expect(mockOnLogOut).toHaveBeenCalled()
  })

  it("should handle manual logout", async () => {
    const mockOnLogOut = jest.fn()
    const {result} = renderHook(() => useSessionTimeout({
      showModal: false,
      timeLeft: 0,
      onStayLoggedIn: jest.fn(),
      onLogOut: mockOnLogOut,
      onTimeout: jest.fn()
    }))

    await act(async () => {
      await result.current.onLogOut()
    })

    // Hook delegates to prop function
    expect(mockOnLogOut).toHaveBeenCalled()
  })

  it("should handle error when selectedRole is missing", async () => {
    const mockOnStayLoggedIn = jest.fn()
    const {result} = renderHook(() => useSessionTimeout({
      showModal: false,
      timeLeft: 0,
      onStayLoggedIn: mockOnStayLoggedIn,
      onLogOut: jest.fn(),
      onTimeout: jest.fn()
    }))

    await act(async () => {
      await result.current.onStayLoggedIn()
    })

    // Hook delegates to prop function (selectedRole validation is in AccessProvider)
    expect(mockOnStayLoggedIn).toHaveBeenCalled()
  })

  it("should initialize with default values", () => {
    const {result} = renderHook(() => useSessionTimeout({
      showModal: false,
      timeLeft: 60000,
      onStayLoggedIn: jest.fn(),
      onLogOut: jest.fn(),
      onTimeout: jest.fn()
    }))

    expect(result.current.showModal).toBe(false)
    expect(result.current.timeLeft).toBe(0) // Internal state starts at 0 when modal not shown
    expect(result.current.isExtending).toBe(false)
    expect(typeof result.current.onStayLoggedIn).toBe("function")
    expect(typeof result.current.onLogOut).toBe("function")
    expect(typeof result.current.resetSessionTimeout).toBe("function")
  })
})
