import "@testing-library/jest-dom"
import {render} from "@testing-library/react"
import {screen} from "@testing-library/dom"
import {useLocation} from "react-router-dom"
import React from "react"
import EpsHeader from "@/components/EpsHeader"
import {AuthContext, type AuthContextType} from "@/context/AuthProvider"
import {AccessContext} from "@/context/AccessProvider"
import {mockAuthState} from "./mocks/AuthStateMock"

// Mock the strings module
jest.mock("@/constants/ui-strings/HeaderStrings", () => ({
  HEADER_STRINGS: {
    CHANGE_ROLE_BUTTON: "Change role",
    CHANGE_ROLE_TARGET: "/change-your-role",
    EXIT_BUTTON: "Exit",
    EXIT_TARGET: "/exit",
    FEEDBACK_BUTTON: "Give feedback (opens in new tab)",
    FEEDBACK_TARGET: "https://feedback.digital.nhs.uk/jfe/form/SV_ahG2dymAdr0oRz8",
    LOG_OUT_BUTTON: "Log out",
    SELECT_YOUR_ROLE_BUTTON: "Select your role",
    SELECT_YOUR_ROLE_TARGET: "/select-your-role",
    SERVICE: "Prescription Tracker (private beta)"
  }
}))

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn(() => ({
    pathname: "/",
    search: "",
    hash: "",
    state: null
  })),
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  )
}))

// Default context values
const defaultAuthContext: AuthContextType = {
  ...mockAuthState,
  error: null,
  user: null,
  isSignedIn: false,
  isSigningIn: false,
  invalidSessionCause: undefined,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  selectedRole: undefined,
  userDetails: undefined,
  isConcurrentSession: false,
  sessionId: undefined,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  hasSingleRoleAccess: jest.fn().mockReturnValue(false),
  updateSelectedRole: jest.fn(),
  updateTrackerUserInfo: jest.fn(),
  updateInvalidSessionCause: jest.fn(),
  isSigningOut: false,
  setIsSigningOut: jest.fn(),
  remainingSessionTime: undefined
}

const renderWithProviders = (
  pathname = "/",
  authOverrides = {}
) => {
  (useLocation as jest.Mock).mockReturnValue({
    pathname,
    search: "",
    hash: "",
    state: null
  })

  const authValue = {...defaultAuthContext, ...authOverrides}

  const mockAccessContext = {
    sessionTimeoutInfo: {showModal: false, timeLeft: 0},
    onStayLoggedIn: jest.fn(),
    onLogOut: jest.fn(),
    onTimeout: jest.fn()
  }

  return render(
    <AuthContext.Provider value={authValue}>
      <AccessContext.Provider value={mockAccessContext}>
        <EpsHeader />
      </AccessContext.Provider>
    </AuthContext.Provider>
  )
}

describe("EpsHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("When the user is NOT signed in", () => {
    beforeEach(() => {
      renderWithProviders("/")
    })

    it("renders the header (role='banner')", () => {
      expect(screen.getByRole("banner")).toBeInTheDocument()
    })

    it("displays the correct service name in the header", () => {
      expect(screen.getByTestId("eps_header_serviceName")).toHaveTextContent(
        "Prescription Tracker (private beta)"
      )
    })

    it("does NOT display the 'Log out' link", () => {
      expect(screen.queryByTestId("eps_header_logout")).not.toBeInTheDocument()
    })

    it("does NOT display the 'Change role' link", () => {
      expect(
        screen.queryByTestId("eps_header_changeRoleLink")
      ).not.toBeInTheDocument()
    })
  })

  describe("When the user IS signed in", () => {
    beforeEach(() => {
      renderWithProviders(
        "/",
        {isSignedIn: true}
      )
    })

    it("renders the header (role='banner')", () => {
      expect(screen.getByRole("banner")).toBeInTheDocument()
    })

    it("displays the correct service name in the header", () => {
      expect(screen.getByTestId("eps_header_serviceName")).toHaveTextContent(
        "Prescription Tracker (private beta)"
      )
    })

    it("displays the 'Log out' link", () => {
      expect(screen.getByTestId("eps_header_logout")).toBeInTheDocument()
      expect(screen.getByTestId("eps_header_logout")).toHaveTextContent(
        "Log out"
      )
    })

    it("does NOT display an 'Exit' button by default", () => {
      expect(screen.queryByTestId("eps_header_exit")).not.toBeInTheDocument()
    })
  })

  describe("Select Your Role link behavior", () => {
    /* eslint-disable max-len */
    it("shows 'Select your role' when user is signed in, route !== /select-your-role, and role not yet selected", () => {
      renderWithProviders(
        "/other-route",
        {isSignedIn: true}
      )

      const link = screen.getByTestId("eps_header_selectYourRoleLink")
      expect(link).toBeInTheDocument()
      expect(link).toHaveTextContent("Select your role")
    })

    it("does NOT show 'Select your role' when the route is /select-your-role", () => {
      renderWithProviders(
        "/select-your-role",
        {isSignedIn: true}
      )

      expect(
        screen.queryByTestId("eps_header_selectYourRoleLink")
      ).not.toBeInTheDocument()
    })

    it("displays the 'Give feedback' link", () => {
      renderWithProviders("/", {isSignedIn: true})

      const feedback = screen.getByTestId("eps_header_feedbackLink")
      expect(feedback).toBeInTheDocument()
      expect(feedback).toHaveTextContent("Give feedback (opens in new tab)")
    })
  })
})
