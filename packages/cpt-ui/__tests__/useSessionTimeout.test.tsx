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
    expect(typeof result.current.resetSessionTimeout).toBe("function")
  })

  it("should handle props mode without triggering effects", () => {
    const mockProps = {
      showModal: false,
      timeLeft: 0,
      onStayLoggedIn: jest.fn(),
      onLogOut: jest.fn()
    }

    const {result} = renderHook(() => useSessionTimeout(mockProps))

    expect(result.current.showModal).toBe(false)
    expect(result.current.timeLeft).toBe(60)
    expect(result.current.onStayLoggedIn).toBeDefined()
    expect(result.current.onLogOut).toBeDefined()
  })

  it("should handle stay logged in with props", async () => {
    const mockOnStayLoggedIn = jest.fn().mockResolvedValue(undefined)
    const mockProps = {
      showModal: false,
      timeLeft: 0,
      onStayLoggedIn: mockOnStayLoggedIn,
      onLogOut: jest.fn()
    }

    const {result} = renderHook(() => useSessionTimeout(mockProps))

    await act(async () => {
      await result.current.onStayLoggedIn()
    })

    expect(mockOnStayLoggedIn).toHaveBeenCalled()
    expect(result.current.isExtending).toBe(false)
  })

  it("should handle log out with props", async () => {
    const mockOnLogOut = jest.fn().mockResolvedValue(undefined)
    const mockProps = {
      showModal: false,
      timeLeft: 0,
      onStayLoggedIn: jest.fn(),
      onLogOut: mockOnLogOut
    }

    const {result} = renderHook(() => useSessionTimeout(mockProps))

    await act(async () => {
      await result.current.onLogOut()
    })

    expect(mockOnLogOut).toHaveBeenCalled()
  })

  it("should cleanup on unmount", () => {
    const {unmount} = renderHook(() => useSessionTimeout())

    expect(() => unmount()).not.toThrow()
  })
})
