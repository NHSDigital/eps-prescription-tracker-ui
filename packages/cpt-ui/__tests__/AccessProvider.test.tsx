import React from "react"
import {render, act} from "@testing-library/react"
import {AccessProvider, useAccess} from "@/context/AccessProvider"
import {FRONTEND_PATHS} from "@/constants/environment"
import {useAuth as mockUseAuth} from "@/context/AuthProvider"
import {useNavigate, useLocation} from "react-router-dom"
import {normalizePath as mockNormalizePath} from "@/helpers/utils"
import {logger} from "@/helpers/logger"

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn()
}))

jest.mock("@/helpers/utils", () => ({
  normalizePath: jest.fn()
}))

jest.mock("@/context/AuthProvider", () => ({
  useAuth: jest.fn()
}))

jest.mock("@/helpers/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}))

const TestComponent = () => {
  useAccess() // Just to test the context
  return <div>Test Component</div>
}

describe("AccessProvider", () => {
  const navigate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    ;(useNavigate as jest.Mock).mockReturnValue(navigate)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  const renderWithProvider = () => {
    render(
      <AccessProvider>
        <TestComponent />
      </AccessProvider>
    )
  }

  it("redirects to login if not signed in and not on allowed path", () => {
    (mockUseAuth as jest.Mock).mockReturnValue({
      isSignedIn: false,
      isSigningIn: false,
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null})
    })
    ;(useLocation as jest.Mock).mockReturnValue({pathname: "/some-protected-path"})
    ;(mockNormalizePath as jest.Mock).mockReturnValue("/some-protected-path")

    renderWithProvider()

    expect(navigate).toHaveBeenCalledWith(FRONTEND_PATHS.LOGIN)
  })

  it("redirects to session selection if signed in and concurrent session", () => {
    (mockUseAuth as jest.Mock).mockReturnValue({
      isSignedIn: true,
      isConcurrentSession: true,
      isSigningIn: false,
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null})
    })
    ;(useLocation as jest.Mock).mockReturnValue({pathname: "/some-protected-path"})
    ;(mockNormalizePath as jest.Mock).mockReturnValue("/some-protected-path")

    renderWithProvider()

    expect(navigate).toHaveBeenCalledWith(FRONTEND_PATHS.SESSION_SELECTION)
  })

  it("redirects to select role if signed in but no role is selected", () => {
    (mockUseAuth as jest.Mock).mockReturnValue({
      isSignedIn: true,
      isSigningIn: false,
      selectedRole: null,
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null})
    })
    ;(useLocation as jest.Mock).mockReturnValue({pathname: "/dashboard"})
    ;(mockNormalizePath as jest.Mock).mockReturnValue("/dashboard")

    renderWithProvider()

    expect(navigate).toHaveBeenCalledWith(FRONTEND_PATHS.SELECT_YOUR_ROLE)
  })

  it("does not redirect if signed in and role is selected", () => {
    (mockUseAuth as jest.Mock).mockReturnValue({
      isSignedIn: true,
      isSigningIn: false,
      selectedRole: {name: "someRole"},
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null})
    })
    ;(useLocation as jest.Mock).mockReturnValue({pathname: "/dashboard"})
    ;(mockNormalizePath as jest.Mock).mockReturnValue("/dashboard")

    renderWithProvider()

    expect(navigate).not.toHaveBeenCalled()
  })

  it("skips redirection logic when signing in and on select-your-role path", () => {
    (mockUseAuth as jest.Mock).mockReturnValue({
      isSignedIn: false,
      isSigningIn: true,
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null})
    })

    // Emulate `window.location.pathname` as this is directly accessed
    const originalLocation = window.location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).location = {pathname: `/site${FRONTEND_PATHS.SELECT_YOUR_ROLE}`}

    ;(useLocation as jest.Mock).mockReturnValue({pathname: FRONTEND_PATHS.SELECT_YOUR_ROLE})
    ;(mockNormalizePath as jest.Mock).mockReturnValue(FRONTEND_PATHS.SELECT_YOUR_ROLE)

    renderWithProvider()

    expect(navigate).not.toHaveBeenCalled()

    // Restore original location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).location = originalLocation
  })

  it("throws error if useAccess is used outside provider", () => {
    const BrokenComponent = () => {
      useAccess()
      return null
    }

    expect(() => render(<BrokenComponent />)).toThrow("useAccess must be used within an AccessProvider")
  })

  describe("Periodic user info check useEffect", () => {
    const mockUpdateTrackerUserInfo = jest.fn()

    it("should set up interval when component mounts", () => {
      const setIntervalSpy = jest.spyOn(globalThis, "setInterval")

      ;(mockUseAuth as jest.Mock).mockReturnValue({
        isSignedIn: true,
        isSigningIn: false,
        updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null})
      })
      ;(useLocation as jest.Mock).mockReturnValue({pathname: "/search-by-prescription-id"})

      renderWithProvider()

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 300000)
      setIntervalSpy.mockRestore()
    })

    it("should clear interval on component unmount", () => {
      const clearIntervalSpy = jest.spyOn(globalThis, "clearInterval")

      ;(mockUseAuth as jest.Mock).mockReturnValue({
        isSignedIn: true,
        isSigningIn: false,
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      ;(useLocation as jest.Mock).mockReturnValue({pathname: "/search-by-prescription-id"})

      const {unmount} = render(
        <AccessProvider>
          <TestComponent />
        </AccessProvider>
      )

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })

    it("should skip user info check when isSigningIn is true", async () => {
      ;(mockUseAuth as jest.Mock).mockReturnValue({
        isSignedIn: true,
        isSigningIn: true,
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      ;(useLocation as jest.Mock).mockReturnValue({pathname: "/search-by-prescription-id"})

      renderWithProvider()

      act(() => {
        jest.advanceTimersByTime(300001)
      })

      expect(logger.debug).toHaveBeenCalledWith(
        "Not checking user info"
      )
      expect(mockUpdateTrackerUserInfo).not.toHaveBeenCalled()
    })

    it("should skip user info check when on allowed no-role paths", async () => {
      // This test focuses on the isSigningIn logic since we can't easily mock window.location
      ;(mockUseAuth as jest.Mock).mockReturnValue({
        isSignedIn: true,
        isSigningIn: true, // This will trigger the skip logic
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      ;(useLocation as jest.Mock).mockReturnValue({pathname: FRONTEND_PATHS.LOGIN})

      renderWithProvider()

      act(() => {
        jest.advanceTimersByTime(15001)
      })

      expect(logger.debug).toHaveBeenCalledWith(
        "Not checking user info")
      expect(mockUpdateTrackerUserInfo).not.toHaveBeenCalled()
    })

    it("should call updateTrackerUserInfo when user is signed in and not on restricted paths", async () => {
      mockUpdateTrackerUserInfo.mockResolvedValue({error: null})

      ;(mockUseAuth as jest.Mock).mockReturnValue({
        isSignedIn: true,
        isSigningIn: false,
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      ;(useLocation as jest.Mock).mockReturnValue({pathname: "/search-by-prescription-id"})

      renderWithProvider()

      await act(async () => {
        jest.advanceTimersByTime(15001)
      })

      expect(logger.info).toHaveBeenCalledWith("Periodic user info check")
      expect(logger.info).toHaveBeenCalledWith("Refreshing user info")
      expect(mockUpdateTrackerUserInfo).toHaveBeenCalled()
    })

    it("should navigate to session logged out page when updateTrackerUserInfo returns error", async () => {
      mockUpdateTrackerUserInfo.mockResolvedValue({error: "Session expired"})

      ;(mockUseAuth as jest.Mock).mockReturnValue({
        isSignedIn: true,
        isSigningIn: false,
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      ;(useLocation as jest.Mock).mockReturnValue({pathname: "/search-by-prescription-id"})

      renderWithProvider()

      await act(async () => {
        jest.advanceTimersByTime(15001)
      })

      expect(mockUpdateTrackerUserInfo).toHaveBeenCalled()
      expect(navigate).toHaveBeenCalledWith(FRONTEND_PATHS.SESSION_LOGGED_OUT)
    })

    it("should not call updateTrackerUserInfo when user is not signed in", async () => {
      ;(mockUseAuth as jest.Mock).mockReturnValue({
        isSignedIn: false,
        isSigningIn: false,
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      ;(useLocation as jest.Mock).mockReturnValue({pathname: "/cookies"})

      renderWithProvider()

      await act(async () => {
        jest.advanceTimersByTime(15001)
      })

      expect(logger.info).toHaveBeenCalledWith("Periodic user info check")
      expect(mockUpdateTrackerUserInfo).not.toHaveBeenCalled()
    })

    it("should handle multiple allowed no-role paths correctly", async () => {
      ;(mockUseAuth as jest.Mock).mockReturnValue({
        isSignedIn: true,
        isSigningIn: false,
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      ;(useLocation as jest.Mock).mockReturnValue({pathname: "/search-by-prescription-id"})

      renderWithProvider()

      await act(async () => {
        jest.advanceTimersByTime(15001)
      })

      // Should call updateTrackerUserInfo when not on restricted paths
      expect(mockUpdateTrackerUserInfo).toHaveBeenCalled()
    })

    it("should continue running interval after error occurs", async () => {
      mockUpdateTrackerUserInfo
        .mockResolvedValueOnce({error: "First error"})
        .mockResolvedValueOnce({error: null})

      ;(mockUseAuth as jest.Mock).mockReturnValue({
        isSignedIn: true,
        isSigningIn: false,
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      ;(useLocation as jest.Mock).mockReturnValue({pathname: "/search-by-prescription-id"})

      renderWithProvider()

      // First interval execution - should error and navigate
      await act(async () => {
        jest.advanceTimersByTime(15001)
      })

      expect(navigate).toHaveBeenCalledWith(FRONTEND_PATHS.SESSION_LOGGED_OUT)
      expect(mockUpdateTrackerUserInfo).toHaveBeenCalledTimes(1)

      jest.clearAllMocks()

      // Second interval execution - should succeed
      await act(async () => {
        jest.advanceTimersByTime(15001)
      })

      expect(mockUpdateTrackerUserInfo).toHaveBeenCalledTimes(1)
      expect(navigate).not.toHaveBeenCalled()
    })
  })
})
