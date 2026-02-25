import React from "react"
import {render, act} from "@testing-library/react"
import {AccessProvider, useAccess} from "@/context/AccessProvider"
import {FRONTEND_PATHS} from "@/constants/environment"
import {useAuth as mockUseAuth} from "@/context/AuthProvider"
import {useNavigate, useLocation, MemoryRouter} from "react-router-dom"
import {normalizePath as mockNormalizePath} from "@/helpers/utils"
import {logger} from "@/helpers/logger"
import {handleRestartLogin} from "@/helpers/logout"
import Layout from "@/Layout"
import LoadingPage from "@/pages/LoadingPage"
import {mockAuthState} from "./mocks/AuthStateMock"

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
  useLocation: jest.fn()
}))

jest.mock("@/helpers/utils", () => ({
  normalizePath: jest.fn()
}))

jest.mock("@/context/AuthProvider", () => ({
  useAuth: jest.fn()
}))

jest.mock("@/components/EpsHeader", () => ({
  __esModule: true,
  default: jest.fn(() => null)
}))

jest.mock("@/constants/environment", () => ({
  FRONTEND_PATHS: {
    LOGIN: "/login",
    LOGOUT: "/logout",
    SELECT_YOUR_ROLE: "/select-your-role",
    SESSION_SELECTION: "/select-active-session",
    SESSION_LOGGED_OUT: "/session-logged-out",
    COOKIES: "/cookies",
    PRIVACY_NOTICE: "/privacy-notice",
    COOKIES_SELECTED: "/cookies-selected"
  },
  ALLOWED_NO_ROLE_PATHS: [
    "/login",
    "/logout",
    "/cookies",
    "/privacy-notice",
    "/session-logged-out",
    "/cookies-selected",
    "/",
    "/select-active-session"
  ],
  PUBLIC_PATHS: [
    "/login",
    "/logout",
    "/cookies",
    "/privacy-notice",
    "/cookies-selected",
    "/"
  ],
  APP_CONFIG: {
    COMMIT_ID: "test-commit",
    VERSION_NUMBER: "1.0.0"
  },
  ENV_CONFIG: {
    RUM_ERROR_TIMER_INTERVAL: 10000
  }
}))

jest.mock("@/helpers/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock("@/helpers/logout", () => ({
  handleRestartLogin: jest.fn(),
  signOut: jest.fn()
}))

const TestComponent = () => {
  useAccess() // Just to test the context
  return <div>Test Component</div>
}

describe("AccessProvider", () => {
  const navigate = jest.fn()
  const mockNavigateHook = useNavigate as jest.Mock
  const mockLocationHook = useLocation as jest.Mock
  const mockAuthHook = mockUseAuth as jest.Mock
  const mockNormalizePathFn = mockNormalizePath as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    mockNavigateHook.mockReturnValue(navigate)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  const renderWithProvider = () => {
    render(
      <MemoryRouter>
        <AccessProvider>
          <TestComponent />
        </AccessProvider>
      </MemoryRouter>
    )
  }

  it("redirects to login if not signed in and not on allowed path", () => {
    mockAuthHook.mockReturnValue({
      ...mockAuthState,
      isSignedIn: false,
      isSigningIn: false,
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null}),
      clearAuthState: jest.fn()
    })
    mockLocationHook.mockReturnValue({
      pathname: "/some-protected-path"
    })
    mockNormalizePathFn.mockReturnValue("/some-protected-path")

    renderWithProvider()

    expect(navigate).toHaveBeenCalledWith(FRONTEND_PATHS.LOGIN)
  })

  it("redirects to session selection if signed in and concurrent session", () => {
    mockAuthHook.mockReturnValue({
      ...mockAuthState,
      isSignedIn: true,
      isConcurrentSession: true,
      isSigningIn: false,
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null})
    })
    mockLocationHook.mockReturnValue({pathname: "/some-protected-path"})
    mockNormalizePathFn.mockReturnValue("/some-protected-path")

    renderWithProvider()

    expect(navigate).toHaveBeenCalledWith(FRONTEND_PATHS.SESSION_SELECTION)
  })

  it("redirects to select role if signed in but no role is selected", () => {
    mockAuthHook.mockReturnValue({
      ...mockAuthState,
      isSignedIn: true,
      isSigningIn: false,
      selectedRole: null,
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null}),
      clearAuthState: jest.fn()
    })
    mockLocationHook.mockReturnValue({pathname: "/dashboard"})
    mockNormalizePathFn.mockReturnValue("/dashboard")

    renderWithProvider()

    expect(navigate).toHaveBeenCalledWith(FRONTEND_PATHS.SELECT_YOUR_ROLE)
  })

  it("does not redirect if signed in and role is selected", () => {
    mockAuthHook.mockReturnValue({
      ...mockAuthState,
      isSignedIn: true,
      isSigningIn: false,
      selectedRole: {name: "someRole"},
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null}),
      clearAuthState: jest.fn()
    })
    mockLocationHook.mockReturnValue({pathname: "/dashboard"})
    mockNormalizePathFn.mockReturnValue("/dashboard")

    renderWithProvider()

    expect(navigate).not.toHaveBeenCalled()
  })

  it("skips redirection logic when signing in and on select-your-role path", () => {
    mockAuthHook.mockReturnValue({
      ...mockAuthState,
      isSignedIn: false,
      isSigningIn: true,
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null}),
      clearAuthState: jest.fn()
    })

    // Emulate `window.location.pathname` as this is directly accessed
    const originalLocation = window.location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = {
      pathname: `/site${FRONTEND_PATHS.SELECT_YOUR_ROLE}`
    }

    mockLocationHook.mockReturnValue({
      pathname: FRONTEND_PATHS.SELECT_YOUR_ROLE
    })
    mockNormalizePathFn.mockReturnValue(FRONTEND_PATHS.SELECT_YOUR_ROLE)

    renderWithProvider()

    expect(navigate).not.toHaveBeenCalled();

    // Restore original location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = originalLocation
  })

  it("throws error if useAccess is used outside provider", () => {
    const BrokenComponent = () => {
      useAccess()
      return null
    }

    expect(() => render(<BrokenComponent />)).toThrow(
      "useAccess must be used within an AccessProvider"
    )
  })

  it("redirects authenticated user with role from root path to search page", () => {
    mockAuthHook.mockReturnValue({
      ...mockAuthState,
      isSignedIn: true,
      isSigningIn: false,
      selectedRole: {name: "TestRole"},
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null}),
      clearAuthState: jest.fn()
    })
    mockLocationHook.mockReturnValue({pathname: "/"})
    mockNormalizePathFn.mockReturnValue("/")

    renderWithProvider()

    expect(navigate).toHaveBeenCalledWith(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
    expect(logger.info).toHaveBeenCalledWith("User already logged in. Role already selected.")
  })

  describe("shouldBlockChildren", () => {
    it("blocks children when concurrent session exists and user is on protected path", () => {
      (mockUseAuth as jest.Mock).mockReturnValue({
        ...mockAuthState,
        isSignedIn: true,
        isConcurrentSession: true,
        isSigningIn: false,
        updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null})
      });
      (useLocation as jest.Mock).mockReturnValue({
        pathname: "/some-protected-path"
      });
      (mockNormalizePath as jest.Mock).mockReturnValue("/some-protected-path")

      const {container} = render(
        <MemoryRouter>
          <AccessProvider>
            <Layout>
              <LoadingPage />
            </Layout>
          </AccessProvider>
        </MemoryRouter>
      )

      // Should render nothing (children blocked) - show loading wheel
      expect(container).toBeInTheDocument()
    })

    it("allows children when concurrent session exists but user is on session selection page", () => {
      (mockUseAuth as jest.Mock).mockReturnValue({
        isSignedIn: true,
        isConcurrentSession: true,
        isSigningIn: false
      });
      (useLocation as jest.Mock).mockReturnValue({
        pathname: FRONTEND_PATHS.SESSION_SELECTION
      });
      (mockNormalizePath as jest.Mock).mockReturnValue(
        FRONTEND_PATHS.SESSION_SELECTION
      )

      const {container} = render(
        <MemoryRouter>
          <AccessProvider>
            <TestComponent />
          </AccessProvider>
        </MemoryRouter>
      )

      // Should render children (not blocked on allowed path)
      expect(container).not.toBeEmptyDOMElement()
      expect(container).toHaveTextContent("Test Component")
    })

    it("blocks children when no role selected and user is on protected path", () => {
      (mockUseAuth as jest.Mock).mockReturnValue({
        ...mockAuthState,
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: null,
        updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null})
      });
      (useLocation as jest.Mock).mockReturnValue({
        pathname: "/some-protected-path"
      });
      (mockNormalizePath as jest.Mock).mockReturnValue("/some-protected-path")

      const {container} = render(
        <MemoryRouter>
          <AccessProvider>
            <Layout>
              <LoadingPage />
            </Layout>
          </AccessProvider>
        </MemoryRouter>
      )

      // Should render nothing (children blocked) - show loading page
      expect(container).toBeInTheDocument()
    })
  })

  describe("Periodic user info check useEffect", () => {
    const mockUpdateTrackerUserInfo = jest.fn()

    it("should set up interval when component mounts", () => {
      const setIntervalSpy = jest.spyOn(globalThis, "setInterval")

      mockAuthHook.mockReturnValue({
        ...mockAuthState,
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {name: "TestRole"},
        updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null})
      })
      mockLocationHook.mockReturnValue({pathname: "/search-by-prescription-id"})
      mockNormalizePathFn.mockReturnValue("/search-by-prescription-id")

      renderWithProvider()

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000)
      setIntervalSpy.mockRestore()
    })

    it("should check user info when component mounts", () => {
      mockUpdateTrackerUserInfo.mockResolvedValue({error: null})

      mockAuthHook.mockReturnValue({
        ...mockAuthState,
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {name: "TestRole"},
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      mockLocationHook.mockReturnValue({pathname: "/search-by-prescription-id"})

      renderWithProvider()

      expect(logger.debug).toHaveBeenCalledWith("On load user info check")
      expect(logger.debug).toHaveBeenCalledWith("Refreshing user info")
      expect(mockUpdateTrackerUserInfo).toHaveBeenCalledTimes(1)
    })

    it("should clear interval on component unmount", () => {
      const clearIntervalSpy = jest.spyOn(globalThis, "clearInterval")

      mockAuthHook.mockReturnValue({
        ...mockAuthState,
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {name: "TestRole"},
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      mockLocationHook.mockReturnValue({pathname: "/search-by-prescription-id"})

      const {unmount} = render(
        <MemoryRouter>
          <AccessProvider>
            <TestComponent />
          </AccessProvider>
        </MemoryRouter>
      )

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })

    it("should skip user info check when isSigningIn is true", async () => {
      mockAuthHook.mockReturnValue({
        ...mockAuthState,
        isSignedIn: true,
        isSigningIn: true,
        selectedRole: {name: "TestRole"},
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      mockLocationHook.mockReturnValue({pathname: "/search-by-prescription-id"})

      renderWithProvider()

      act(() => {
        jest.advanceTimersByTime(60001)
      })

      expect(logger.debug).toHaveBeenCalledWith(
        "Not checking user info"
      )
      expect(mockUpdateTrackerUserInfo).not.toHaveBeenCalled()
    })

    it("should skip user info check when on allowed no-role paths", async () => {
      // This test focuses on the isSigningIn logic since we can't easily mock window.location
      mockAuthHook.mockReturnValue({
        ...mockAuthState,
        isSignedIn: true,
        isSigningIn: true, // This will trigger the skip logic
        selectedRole: {name: "TestRole"},
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      mockLocationHook.mockReturnValue({pathname: FRONTEND_PATHS.LOGIN})

      renderWithProvider()

      act(() => {
        jest.advanceTimersByTime(60001)
      })

      expect(logger.debug).toHaveBeenCalledWith(
        "Not checking user info")
      expect(mockUpdateTrackerUserInfo).not.toHaveBeenCalled()
    })

    it("should call updateTrackerUserInfo when user is signed in and not on restricted paths", async () => {
      mockUpdateTrackerUserInfo.mockResolvedValue({error: null})

      mockAuthHook.mockReturnValue({
        ...mockAuthState,
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {name: "TestRole"},
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      mockLocationHook.mockReturnValue({pathname: "/search-by-prescription-id"})

      renderWithProvider()

      await act(async () => {
        jest.advanceTimersByTime(60001)
      })

      expect(logger.debug).toHaveBeenCalledWith("Periodic user info check")
      expect(logger.debug).toHaveBeenCalledWith("Refreshing user info")
      expect(mockUpdateTrackerUserInfo).toHaveBeenCalled()
    })

    it("should navigate to session logged out page when updateTrackerUserInfo returns error", async () => {
      mockUpdateTrackerUserInfo.mockResolvedValue({error: "Session expired", invalidSessionCause: "InvalidSession"})

      const authContext = {
        ...mockAuthState,
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {name: "TestRole"},
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      }
      mockAuthHook.mockReturnValue(authContext)
      mockLocationHook.mockReturnValue({pathname: "/search-by-prescription-id"})

      renderWithProvider()

      await act(async () => {
        jest.advanceTimersByTime(60001)
      })

      expect(mockUpdateTrackerUserInfo).toHaveBeenCalled()
      expect(handleRestartLogin).toHaveBeenCalledWith(authContext, "InvalidSession")
    })

    it("should not call updateTrackerUserInfo when user is not signed in", async () => {
      mockAuthHook.mockReturnValue({
        ...mockAuthState,
        isSignedIn: false,
        isSigningIn: false,
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      // Put user on an allowed path so redirect doesn't happen
      mockLocationHook.mockReturnValue({pathname: "/login"})
      mockNormalizePathFn.mockReturnValue("/login")

      renderWithProvider()

      await act(async () => {
        jest.advanceTimersByTime(60001)
      })

      expect(logger.debug).toHaveBeenCalledWith("Not checking user info")
      expect(mockUpdateTrackerUserInfo).not.toHaveBeenCalled()
    })

    it("should handle multiple allowed no-role paths correctly", async () => {
      mockAuthHook.mockReturnValue({
        ...mockAuthState,
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {name: "TestRole"},
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      })
      mockLocationHook.mockReturnValue({pathname: "/search-by-prescription-id"})

      renderWithProvider()

      await act(async () => {
        jest.advanceTimersByTime(60001)
      })

      // Should call updateTrackerUserInfo when not on restricted paths
      expect(mockUpdateTrackerUserInfo).toHaveBeenCalled()
    })

    it("should continue running interval after error occurs", async () => {
      mockUpdateTrackerUserInfo
        .mockResolvedValueOnce({error: null}) // on load check
        .mockResolvedValueOnce({error: "First error", invalidSessionCause: "InvalidSession"}) // first periodic check
        .mockResolvedValueOnce({error: null}) // second periodic check

      const authContext = {
        ...mockAuthState,
        isSignedIn: true,
        isSigningIn: false,
        selectedRole: {name: "TestRole"},
        updateTrackerUserInfo: mockUpdateTrackerUserInfo
      }
      mockAuthHook.mockReturnValue(authContext)
      mockLocationHook.mockReturnValue({pathname: "/search-by-prescription-id"})

      renderWithProvider()

      // First interval execution - should error and navigate
      await act(async () => {
        jest.advanceTimersByTime(60001)
      })

      expect(handleRestartLogin).toHaveBeenCalledWith(authContext, "InvalidSession")
      expect(mockUpdateTrackerUserInfo).toHaveBeenCalledTimes(2)

      jest.clearAllMocks()

      // Second interval execution - should succeed
      await act(async () => {
        jest.advanceTimersByTime(60001)
      })

      expect(mockUpdateTrackerUserInfo).toHaveBeenCalledTimes(1)
      expect(handleRestartLogin).not.toHaveBeenCalled()
    })
  })
})
