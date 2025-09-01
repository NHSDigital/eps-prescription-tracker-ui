import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import Layout from "../src/Layout"
import {AuthContextType, useAuth} from "@/context/AuthProvider"
import {FRONTEND_PATHS} from "@/constants/environment"

jest.mock("@/components/EpsHeader", () => () => <div data-testid="eps-header">Header</div>)
jest.mock("@/components/RBACBanner", () => () => <div data-testid="rbac-banner">RBAC</div>)
jest.mock("@/components/EpsFooter", () => () => <div data-testid="eps-footer">Footer</div>)
jest.mock("@/components/PatientDetailsBanner", () => () => <div data-testid="patient-banner">Patient</div>)
jest.mock("@/components/PrescriptionInformationBanner", () => () => (
  <div data-testid="prescription-banner">Prescription</div>
)
)

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
    })

    describe("on protected paths", () => {
      it("should redirect to login on prescription search path", () => {
        renderLayout("/search-by-prescription-id")

        const navigateElement = screen.getByTestId("navigate")
        expect(navigateElement).toBeInTheDocument()
        expect(navigateElement).toHaveAttribute("data-to", FRONTEND_PATHS.LOGIN)
        expect(navigateElement).toHaveAttribute("data-replace", "true")
      })

      it("should redirect to login on prescription details path", () => {
        renderLayout("/prescription-details")

        const navigateElement = screen.getByTestId("navigate")
        expect(navigateElement).toBeInTheDocument()
        expect(navigateElement).toHaveAttribute("data-to", FRONTEND_PATHS.LOGIN)
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
      expect(screen.queryByTestId("prescription-banner")).not.toBeInTheDocument()
      expect(screen.queryByTestId("outlet")).not.toBeInTheDocument()
    })
  })
})
