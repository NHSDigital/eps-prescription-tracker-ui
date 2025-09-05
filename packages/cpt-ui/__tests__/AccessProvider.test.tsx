import React from "react"
import {render} from "@testing-library/react"
import {AccessProvider, useAccess} from "@/context/AccessProvider"
import {FRONTEND_PATHS} from "@/constants/environment"
import {useAuth as mockUseAuth} from "@/context/AuthProvider"
import {useNavigate, useLocation} from "react-router-dom"
import {normalizePath as mockNormalizePath} from "@/helpers/utils"

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

const TestComponent = () => {
  useAccess() // Just to test the context
  return <div>Test Component</div>
}

describe("AccessProvider", () => {
  const navigate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(navigate)
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
      clearAuthState: jest.fn()
    });
    (useLocation as jest.Mock).mockReturnValue({
      pathname: "/some-protected-path"
    });
    (mockNormalizePath as jest.Mock).mockReturnValue("/some-protected-path")

    renderWithProvider()

    expect(navigate).toHaveBeenCalledWith(FRONTEND_PATHS.LOGIN)
  })

  it("redirects to session selection if signed in and concurrent session", () => {
    (mockUseAuth as jest.Mock).mockReturnValue({
      isSignedIn: true,
      isConcurrentSession: true,
      isSigningIn: false
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
      clearAuthState: jest.fn()
    });
    (useLocation as jest.Mock).mockReturnValue({pathname: "/dashboard"});
    (mockNormalizePath as jest.Mock).mockReturnValue("/dashboard")

    renderWithProvider()

    expect(navigate).toHaveBeenCalledWith(FRONTEND_PATHS.SELECT_YOUR_ROLE)
  })

  it("does not redirect if signed in and role is selected", () => {
    (mockUseAuth as jest.Mock).mockReturnValue({
      isSignedIn: true,
      isSigningIn: false,
      selectedRole: {name: "someRole"},
      clearAuthState: jest.fn()
    });
    (useLocation as jest.Mock).mockReturnValue({pathname: "/dashboard"});
    (mockNormalizePath as jest.Mock).mockReturnValue("/dashboard")

    renderWithProvider()

    expect(navigate).not.toHaveBeenCalled()
  })

  it("skips redirection logic when signing in and on select-your-role path", () => {
    (mockUseAuth as jest.Mock).mockReturnValue({
      isSignedIn: false,
      isSigningIn: true,
      clearAuthState: jest.fn()
    })

    // Emulate `window.location.pathname` as this is directly accessed
    const originalLocation = window.location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = {
      pathname: `/site${FRONTEND_PATHS.SELECT_YOUR_ROLE}`
    };

    (useLocation as jest.Mock).mockReturnValue({
      pathname: FRONTEND_PATHS.SELECT_YOUR_ROLE
    });
    (mockNormalizePath as jest.Mock).mockReturnValue(
      FRONTEND_PATHS.SELECT_YOUR_ROLE
    )

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
})
