import {renderHook, act} from "@testing-library/react"
import {useSessionTimeout} from "@/hooks/useSessionTimeout"
import {logger} from "@/helpers/logger"
import {useAuth} from "@/context/AuthProvider"
import {mockAuthState} from "./mocks/AuthStateMock"

// Create mock implementations
const mockSetSessionTimeoutModalInfo = jest.fn()
const mockSetLogoutModalType = jest.fn()
const mockUpdateTrackerUserInfo = jest.fn()
const mockUpdateInvalidSessionCause = jest.fn()

const testRole = {role_id: "123", org_code: "ABC", role_name: "Test Role"}

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

// Mock useNavigate and assign to a variable for assertions
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

const mockUpdateRemoteSelectedRole = jest.fn()
jest.mock("@/helpers/userInfo", () => {
  const actual = jest.requireActual("@/helpers/userInfo")
  return {
    ...actual,
    updateRemoteSelectedRole: (...args: Array<unknown>) => mockUpdateRemoteSelectedRole(...args)
  }
})

const defaultAuthOverrides = {
  selectedRole: testRole,
  sessionTimeoutModalInfo: {
    showModal: false,
    timeLeft: 60,
    action: undefined,
    buttonDisabled: false
  },
  setSessionTimeoutModalInfo: mockSetSessionTimeoutModalInfo,
  setLogoutModalType: mockSetLogoutModalType,
  updateTrackerUserInfo: mockUpdateTrackerUserInfo,
  updateInvalidSessionCause: mockUpdateInvalidSessionCause
}

const mockHandleSignoutEvent = jest.fn()
jest.mock("@/helpers/logout", () => {
  const actual = jest.requireActual("@/helpers/logout")
  return {
    ...actual,
    handleSignoutEvent: (...args: Array<unknown>) => mockHandleSignoutEvent(...args),
    signOut: jest.fn()
  }
})

const mockUseAuth = useAuth as jest.Mock
const mockAuthReturnState = {
  ...mockAuthState,
  ...defaultAuthOverrides
}

describe("useSessionTimeout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateTrackerUserInfo.mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({
      ...mockAuthReturnState
    })
  })

  it("should return the expected handler functions", () => {
    const {result} = renderHook(() => useSessionTimeout())

    expect(typeof result.current.onStayLoggedIn).toBe("function")
    expect(typeof result.current.onLogOut).toBe("function")
    expect(typeof result.current.onTimeOut).toBe("function")
    expect(typeof result.current.resetSessionTimeout).toBe("function")
  })

  describe("onStayLoggedIn", () => {
    it("should extend the session when a role is selected", async () => {
      const {result} = renderHook(() => useSessionTimeout())

      await act(async () => {
        await result.current.onStayLoggedIn()
      })

      expect(mockUpdateRemoteSelectedRole).toHaveBeenCalledWith(testRole)
      expect(mockSetLogoutModalType).toHaveBeenCalledWith(undefined)
      expect(mockSetSessionTimeoutModalInfo).toHaveBeenCalled()
      expect(mockUpdateTrackerUserInfo).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith("Session extended successfully")
    })

    it("should set buttonDisabled and action to extending", async () => {
      const {result} = renderHook(() => useSessionTimeout())

      await act(async () => {
        await result.current.onStayLoggedIn()
      })

      // First call should set action to extending and disable buttons
      const firstCall = mockSetSessionTimeoutModalInfo.mock.calls[0][0]
      // It's a functional updater, so call it with mock prev state
      const updatedState = firstCall({
        showModal: true, timeLeft: 60, action: undefined, buttonDisabled: false
      })
      expect(updatedState.action).toBe("extending")
      expect(updatedState.buttonDisabled).toBe(true)
    })

    it("should hide modal and reset state after successful extension", async () => {
      const {result} = renderHook(() => useSessionTimeout())

      await act(async () => {
        await result.current.onStayLoggedIn()
      })

      // Second call should hide modal & reset
      const secondCall = mockSetSessionTimeoutModalInfo.mock.calls[1][0]
      const updatedState = secondCall({
        showModal: true, timeLeft: 60, action: "extending", buttonDisabled: true
      })
      expect(updatedState.showModal).toBe(false)
      expect(updatedState.timeLeft).toBe(0)
      expect(updatedState.buttonDisabled).toBe(false)
      expect(updatedState.action).toBeUndefined()
    })

    it("should log error when selectedRole is missing", async () => {
      mockUseAuth.mockReturnValue({
        ...mockAuthReturnState,
        selectedRole: undefined
      })

      const {result} = renderHook(() => useSessionTimeout())

      await act(async () => {
        await result.current.onStayLoggedIn()
      })

      expect(logger.error).toHaveBeenCalledWith("No selected role available to extend session")
      expect(mockUpdateRemoteSelectedRole).not.toHaveBeenCalled()
    })

    it("should handle error from updateRemoteSelectedRole", async () => {
      mockUpdateRemoteSelectedRole.mockRejectedValue(new Error("API Error"))

      const {result} = renderHook(() => useSessionTimeout())

      await act(async () => {
        await result.current.onStayLoggedIn()
      })

      expect(logger.error).toHaveBeenCalledWith("Error extending session:", expect.any(Error))
      // Should set action to loggingOut
      const errorCall = mockSetSessionTimeoutModalInfo.mock.calls[1][0]
      const updatedState = errorCall({
        showModal: true, timeLeft: 60, action: "extending", buttonDisabled: true
      })
      expect(updatedState.action).toBe("loggingOut")
      expect(updatedState.buttonDisabled).toBe(true)
    })

    it("should prevent duplicate calls via actionLockRef", async () => {
      // Make the first call hang so we can attempt a second
      mockUpdateRemoteSelectedRole.mockImplementation(
        () => new Promise(() => {}) // never resolves
      )

      const {result} = renderHook(() => useSessionTimeout())

      // Start first call (won't resolve)
      act(() => {
        result.current.onStayLoggedIn()
      })

      // Attempt second call — should be ignored
      await act(async () => {
        await result.current.onStayLoggedIn()
      })

      expect(logger.info).toHaveBeenCalledWith(
        "Session action already in progress, ignoring duplicate request"
      )
      // updateRemoteSelectedRole should only have been called once
      expect(mockUpdateRemoteSelectedRole).toHaveBeenCalledTimes(1)
    })
  })

  describe("onLogOut", () => {
    beforeEach(() => {
      jest.clearAllMocks()
      mockUseAuth.mockReturnValue({
        ...mockAuthReturnState
      })
    })

    it("should call handleSignoutEvent with navigate and cause", async () => {
      const {result} = renderHook(() => useSessionTimeout())

      await act(async () => {
        await result.current.onLogOut()
      })

      expect(mockHandleSignoutEvent).toHaveBeenCalledWith(expect.objectContaining(mockAuthReturnState),
        mockNavigate, "Timeout")
      expect(mockSetLogoutModalType).toHaveBeenCalledWith(undefined)
      expect(logger.info).toHaveBeenCalledWith(
        "User chose to log out from session timeout modal"
      )
    })

    it("should set loggingOut action and disable buttons", async () => {
      const {result} = renderHook(() => useSessionTimeout())

      await act(async () => {
        await result.current.onLogOut()
      })

      const updaterFn = mockSetSessionTimeoutModalInfo.mock.calls[0][0]
      const updatedState = updaterFn({
        showModal: true, timeLeft: 60, action: undefined, buttonDisabled: false
      })
      expect(updatedState.action).toBe("loggingOut")
      expect(updatedState.buttonDisabled).toBe(true)
    })

    it("should prevent duplicate logout calls", async () => {
      const {result} = renderHook(() => useSessionTimeout())

      act(() => {
        result.current.onLogOut()
      })

      await act(async () => {
        await result.current.onLogOut()
      })

      expect(logger.info).toHaveBeenCalledWith(
        "Session action already in progress, ignoring duplicate request"
      )
      expect(mockHandleSignoutEvent).toHaveBeenCalledTimes(1)
    })

    it("should prevent cross-calls (stay logged in then log out)", async () => {
      mockUpdateRemoteSelectedRole.mockImplementation(
        () => new Promise(() => {})
      )

      const {result} = renderHook(() => useSessionTimeout())

      // Start stay-logged-in (hangs)
      act(() => {
        result.current.onStayLoggedIn()
      })

      // Attempt logout — should be blocked by actionLockRef
      await act(async () => {
        await result.current.onLogOut()
      })

      expect(mockHandleSignoutEvent).not.toHaveBeenCalled()
    })
  })

  describe("onTimeOut", () => {
    it("should clear timer, set invalid session cause and restart login", async () => {
      const {result} = renderHook(() => useSessionTimeout())

      await act(async () => {
        await result.current.onTimeOut()
      })

      expect(logger.warn).toHaveBeenCalledWith("Session automatically timed out")
      expect(mockUpdateInvalidSessionCause).toHaveBeenCalledWith("Timeout")
      expect(mockHandleSignoutEvent).toHaveBeenCalledWith(expect.objectContaining(mockAuthReturnState),
        mockNavigate, "Timeout")
      // clearCountdownTimer should have reset timeLeft to 0
      const updaterFn = mockSetSessionTimeoutModalInfo.mock.calls[0][0]
      const updatedState = updaterFn({
        showModal: true, timeLeft: 60, action: undefined, buttonDisabled: false
      })
      expect(updatedState.timeLeft).toBe(0)
    })
  })
})
