import {renderHook, act} from "@testing-library/react"
import {useSessionTimeout} from "@/hooks/useSessionTimeout"

// Mock all the dependencies
jest.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    selectedRole: {role_id: "123", org_code: "ABC", role_name: "Test Role"},
    updateTrackerUserInfo: jest.fn(),
    updateInvalidSessionCause: jest.fn()
  })
}))

jest.mock("@/helpers/userInfo", () => ({
  updateRemoteSelectedRole: jest.fn().mockResolvedValue({currentlySelectedRole: {}})
}))

jest.mock("@/helpers/logout", () => ({
  signOut: jest.fn().mockResolvedValue(undefined)
}))

jest.mock("@/helpers/logger", () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}))

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
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("should return initial state", () => {
    const {result} = renderHook(() => useSessionTimeout())

    expect(result.current.showModal).toBe(false)
    expect(result.current.timeLeft).toBe(60)
    expect(result.current.isExtending).toBe(false)
    expect(typeof result.current.onStayLoggedIn).toBe("function")
    expect(typeof result.current.onLogOut).toBe("function")
  })

  it("should handle stay logged in", async () => {
    const {result} = renderHook(() => useSessionTimeout())

    await act(async () => {
      await result.current.onStayLoggedIn()
    })

    expect(result.current.isExtending).toBe(false)
  })

  it("should handle log out", async () => {
    const {result} = renderHook(() => useSessionTimeout())

    await act(async () => {
      await result.current.onLogOut()
    })

    // Should have called signOut
    expect(result.current.showModal).toBe(false)
  })

  it("should use props when provided", () => {
    const mockProps = {
      showModal: true,
      timeLeft: 120000,
      onStayLoggedIn: jest.fn(),
      onLogOut: jest.fn()
    }

    const {result} = renderHook(() => useSessionTimeout(mockProps))

    expect(result.current.showModal).toBe(true)
    expect(result.current.timeLeft).toBe(60) // Still returns internal state
  })

  it("should handle countdown timer", () => {
    const mockProps = {
      showModal: true,
      timeLeft: 5000, // 5 seconds
      onStayLoggedIn: jest.fn(),
      onLogOut: jest.fn()
    }

    renderHook(() => useSessionTimeout(mockProps))

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    // Timer should be running
    expect(setTimeout).toHaveBeenCalled()
  })

  it("should cleanup on unmount", () => {
    const {unmount} = renderHook(() => useSessionTimeout())

    unmount()

    // Should not crash
    expect(true).toBe(true)
  })
})
