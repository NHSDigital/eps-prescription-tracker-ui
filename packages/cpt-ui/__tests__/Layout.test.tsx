import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import Layout from "../src/Layout"
import {AuthContextType, useAuth} from "@/context/AuthProvider"
import {FRONTEND_PATHS, PUBLIC_PATHS} from "@/constants/environment"

// Mock environment constants to ensure they're available in tests
jest.mock("@/constants/environment", () => ({
  AUTH_CONFIG: {
    USER_POOL_ID: "test-pool-id",
    USER_POOL_CLIENT_ID: "test-client-id",
    HOSTED_LOGIN_DOMAIN: "test.auth.domain.com",
    REDIRECT_SIGN_IN: "http://localhost/login",
    REDIRECT_SIGN_OUT: "http://localhost/logout"
  },
  ENV_CONFIG: {
    TARGET_ENVIRONMENT: "test",
    API_DOMAIN_OVERRIDE: undefined,
    BASE_PATH: "site",
    LOCAL_DEV: false,
    BASE_URL: "/"
  },
  APP_CONFIG: {
    SERVICE_NAME: "test-service",
    COMMIT_ID: "test-commit",
    VERSION_NUMBER: "test-version",
    REACT_LOG_LEVEL: "info"
  },
  API_ENDPOINTS: {
    TRACKER_USER_INFO: "/api/tracker-user-info",
    SELECTED_ROLE: "/api/selected-role",
    PRESCRIPTION_LIST: "/api/prescription-list",
    CIS2_SIGNOUT_ENDPOINT: "/api/cis2-signout",
    PRESCRIPTION_DETAILS: "/api/prescription-details",
    PATIENT_SEARCH: "/api/patient-search"
  },
  RUM_CONFIG: {
    GUEST_ROLE_ARN: "test-role-arn",
    IDENTITY_POOL_ID: "test-identity-pool",
    ENDPOINT: "https://dataplane.rum.eu-west-2.amazonaws.com",
    APPLICATION_ID: "test-app-id",
    REGION: "eu-west-2",
    VERSION: "1.0.0",
    ALLOW_COOKIES: true,
    ENABLE_XRAY: false,
    SESSION_SAMPLE_RATE: 1,
    TELEMETRIES: [],
    RELEASE_ID: "test-commit"
  },
  FRONTEND_PATHS: {
    PRESCRIPTION_LIST_CURRENT: "/prescription-list-current",
    PRESCRIPTION_LIST_FUTURE: "/prescription-list-future",
    PRESCRIPTION_LIST_PAST: "/prescription-list-past",
    COOKIES: "/cookies",
    LOGIN: "/login",
    LOGOUT: "/logout",
    SELECT_YOUR_ROLE: "/select-your-role",
    YOUR_SELECTED_ROLE: "/your-selected-role",
    CHANGE_YOUR_ROLE: "/change-your-role",
    SEARCH_BY_PRESCRIPTION_ID: "/search-by-prescription-id",
    SEARCH_BY_NHS_NUMBER: "/search-by-nhs-number",
    SEARCH_BY_BASIC_DETAILS: "/search-by-basic-details",
    PRESCRIPTION_DETAILS_PAGE: "/prescription-details",
    PATIENT_SEARCH_RESULTS: "/patient-search-results",
    PATIENT_NOT_FOUND: "/patient-not-found",
    PRIVACY_NOTICE: "/privacy-notice",
    COOKIES_SELECTED: "/cookies-selected"
  },
  PUBLIC_PATHS: [
    "/login",
    "/logout",
    "/cookies",
    "/privacy-notice",
    "/cookies-selected",
    "/",
    "/notfound"
  ],
  AUTO_LOGIN_ENVIRONMENTS: [
    {environment: "dev", loginMethod: "mock"},
    {environment: "dev-pr", loginMethod: "mock"},
    {environment: "int", loginMethod: "cis2"},
    {environment: "prod", loginMethod: "cis2"}
  ]
}))

jest.mock("@/components/EpsHeader", () => () => (
  <div data-testid="eps-header">Header</div>
))
jest.mock("@/components/RBACBanner", () => () => (
  <div data-testid="rbac-banner">RBAC</div>
))
jest.mock("@/components/EpsFooter", () => () => (
  <div data-testid="eps-footer">Footer</div>
))
jest.mock("@/components/PatientDetailsBanner", () => () => (
  <div data-testid="patient-banner">Patient</div>
))
jest.mock("@/components/PrescriptionInformationBanner", () => () => (
  <div data-testid="prescription-banner">Prescription</div>
))

jest.mock("@/context/AuthProvider")
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  Navigate: ({to, replace}: { to: string; replace?: boolean }) => {
    mockNavigate(to, replace)
    return <div data-testid="navigate" data-to={to} data-replace={replace} />
  },
  Outlet: () => <div data-testid="outlet">Page Content</div>
}))

describe("Layout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderLayout = (path = "/search-by-prescription-id") => {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Layout />
      </MemoryRouter>
    )
  }

  describe("when user is signed in", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isSignedIn: true,
        isSigningIn: false
      } as unknown as AuthContextType)
    })

    it("should render normal layout components", () => {
      renderLayout("/search-by-prescription-id")

      expect(screen.getByTestId("eps-header")).toBeInTheDocument()
      expect(screen.getByTestId("patient-banner")).toBeInTheDocument()
      expect(screen.getByTestId("prescription-banner")).toBeInTheDocument()
      expect(screen.getByTestId("outlet")).toBeInTheDocument()
      expect(screen.getByTestId("rbac-banner")).toBeInTheDocument()
      expect(screen.getByTestId("eps-footer")).toBeInTheDocument()
    })

    it("should not redirect to login", () => {
      renderLayout("/search-by-prescription-id")

      expect(screen.queryByTestId("navigate")).not.toBeInTheDocument()
    })
  })

  describe("when user is signing in", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isSignedIn: false,
        isSigningIn: true
      } as unknown as AuthContextType)
    })

    it("should render normal layout without redirect", () => {
      renderLayout("/search-by-prescription-id")

      expect(screen.getByTestId("eps-header")).toBeInTheDocument()
      expect(screen.queryByTestId("navigate")).not.toBeInTheDocument()
    })
  })

  describe("when user is not signed in", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isSignedIn: false,
        isSigningIn: false
      } as unknown as AuthContextType)
    })

    describe("on public paths", () => {
      it("should render normal layout on login path", () => {
        renderLayout(FRONTEND_PATHS.LOGIN)

        expect(screen.getByTestId("eps-header")).toBeInTheDocument()
        expect(screen.queryByTestId("navigate")).not.toBeInTheDocument()
      })

      it("should render normal layout on logout path", () => {
        renderLayout(FRONTEND_PATHS.LOGOUT)

        expect(screen.getByTestId("eps-header")).toBeInTheDocument()
        expect(screen.queryByTestId("navigate")).not.toBeInTheDocument()
      })

      it("should render normal layout on root path", () => {
        renderLayout("/")

        expect(screen.getByTestId("eps-header")).toBeInTheDocument()
        expect(screen.queryByTestId("navigate")).not.toBeInTheDocument()
      })

      it("should have all expected public paths in configuration", () => {
        expect(PUBLIC_PATHS).toContain(FRONTEND_PATHS.LOGIN)
        expect(PUBLIC_PATHS).toContain(FRONTEND_PATHS.LOGOUT)
        expect(PUBLIC_PATHS).toContain("/")
      })
    })

    describe("on protected paths", () => {
      it("should redirect to login on prescription search path", () => {
        renderLayout("/search-by-prescription-id")

        const navigateElement = screen.getByTestId("navigate")
        expect(navigateElement).toBeInTheDocument()
        expect(navigateElement).toHaveAttribute(
          "data-to",
          FRONTEND_PATHS.LOGIN
        )
        expect(navigateElement).toHaveAttribute("data-replace", "true")
      })

      it("should redirect to login on prescription details path", () => {
        renderLayout("/prescription-details")

        const navigateElement = screen.getByTestId("navigate")
        expect(navigateElement).toBeInTheDocument()
        expect(navigateElement).toHaveAttribute(
          "data-to",
          FRONTEND_PATHS.LOGIN
        )
      })

      it("should not render layout components on protected path", () => {
        renderLayout("/search-by-prescription-id")

        // should only see Navigate, not layout components
        expect(screen.queryByTestId("eps-header")).not.toBeInTheDocument()
        expect(screen.queryByTestId("outlet")).not.toBeInTheDocument()
        expect(screen.queryByTestId("eps-footer")).not.toBeInTheDocument()
      })
    })
  })

  describe("render guard security", () => {
    it("should prevent authenticated UI from showing before redirect", () => {
      mockUseAuth.mockReturnValue({
        isSignedIn: false,
        isSigningIn: false
      } as unknown as AuthContextType)

      renderLayout("/search-by-prescription-id")

      // navigate should be rendered immediately, no layout components
      expect(screen.getByTestId("navigate")).toBeInTheDocument()
      expect(screen.queryByTestId("eps-header")).not.toBeInTheDocument()
      expect(screen.queryByTestId("patient-banner")).not.toBeInTheDocument()
      expect(
        screen.queryByTestId("prescription-banner")
      ).not.toBeInTheDocument()
      expect(screen.queryByTestId("outlet")).not.toBeInTheDocument()
    })
  })
})
