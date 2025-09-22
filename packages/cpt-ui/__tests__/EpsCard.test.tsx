import "@testing-library/jest-dom"
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor
} from "@testing-library/react"
import {MemoryRouter, Route, Routes} from "react-router-dom"
import EpsCard from "@/components/EpsCard"
import {AuthContext, AuthContextType} from "@/context/AuthProvider"
import {AccessContext} from "@/context/AccessProvider"
import {AxiosError, AxiosHeaders} from "axios"
import {RoleDetails} from "@cpt-ui-common/common-types"

// Mock the auth configuration
jest.mock("@/context/configureAmplify", () => ({
  __esModule: true,
  authConfig: {
    Auth: {
      Cognito: {
        userPoolClientId: "mockUserPoolClientId",
        userPoolId: "mockUserPoolId",
        loginWith: {
          oauth: {
            domain: "mockHostedLoginDomain",
            scopes: [
              "openid",
              "email",
              "phone",
              "profile",
              "aws.cognito.signin.user.admin"
            ],
            redirectSignIn: ["mockRedirectSignIn"],
            redirectSignOut: ["mockRedirectSignOut"],
            responseType: "code"
          },
          username: true,
          email: false,
          phone: false
        }
      }
    }
  }
}))

// Mock EPS_CARD_STRINGS
jest.mock("@/constants/ui-strings/CardStrings", () => ({
  EPS_CARD_STRINGS: {
    noODSCode: "No ODS code",
    noOrgName: "NO ORG NAME",
    noRoleName: "No role name",
    noAddress: "Address not found"
  }
}))

jest.mock("@/constants/environment", () => ({
  API_ENDPOINTS: {
    TRACKER_USER_INFO: "/mock-endpoint",
    SELECTED_ROLE: "/mock-endpoint"
  },
  APP_CONFIG: {
    REACT_LOG_LEVEL: "debug"
  },
  FRONTEND_PATHS: {
    LOGIN: "/login"
  }
}))

jest.mock("@/helpers/userInfo", () => ({
  updateSelectedRole: jest.fn()
}))

const mockRole = {
  role_id: "123",
  org_name: "Test Organization",
  org_code: "XYZ123",
  role_name: "Pharmacist",
  site_address: "123 Test Street\nTest City"
}

const mockLink = "/role-detail"

const mockUpdateSelectedRole = jest.fn()

// Update default auth context with proper JWT
const defaultAuthContext: AuthContextType = {
  error: null,
  user: null,
  isSignedIn: true,
  isSigningIn: false,
  invalidSessionCause: undefined,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  hasNoAccess: true,
  hasSingleRoleAccess: true,
  selectedRole: undefined,
  userDetails: undefined,
  isConcurrentSession: false,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  updateSelectedRole: mockUpdateSelectedRole,
  updateTrackerUserInfo: jest.fn()
}

const renderWithProviders = (props: { role: RoleDetails; link: string }) => {
  return render(
    <AuthContext.Provider value={defaultAuthContext}>
      <AccessContext.Provider value={null}>
        <MemoryRouter initialEntries={["/eps-card"]}>
          <Routes>
            <Route path="/eps-card" element={<EpsCard {...props} />} />
            <Route path="/login" element={<div data-testid="login-page-shown" />} />
            <Route path="/role-detail" element={<div data-testid="role-detail-page" />} />
          </Routes>
        </MemoryRouter>
      </AccessContext.Provider>
    </AuthContext.Provider>
  )
}

describe("EpsCard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // eslint-disable-next-line no-undef
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({message: "Success"})
      })
    )
  })

  it("renders role details correctly", () => {
    renderWithProviders({role: mockRole, link: mockLink})

    expect(
      screen.getByText((content) => content.includes("Test Organization"))
    ).toBeInTheDocument()
    expect(
      screen.getByText((content) => content.includes("ODS: XYZ123"))
    ).toBeInTheDocument()
    expect(screen.getByText("Pharmacist")).toBeInTheDocument()
    expect(screen.getByText("123 Test Street")).toBeInTheDocument()
    expect(screen.getByText("Test City")).toBeInTheDocument()
  })

  it("handles missing role data gracefully", () => {
    renderWithProviders({role: {}, link: mockLink})

    expect(
      screen.getByText((content) => content.includes("NO ORG NAME"))
    ).toBeInTheDocument()
    expect(
      screen.getByText((content) => content.includes("ODS: No ODS code"))
    ).toBeInTheDocument()
    expect(screen.getByText("No role name")).toBeInTheDocument()
    expect(screen.getByText("Address not found")).toBeInTheDocument()
  })

  it("calls API and navigates on card click", async () => {
    renderWithProviders({role: mockRole, link: mockLink})

    act(() => {
      const cardLink = screen.getByRole("link", {name: /test organization/i})
      fireEvent.click(cardLink)
    })

    await waitFor(() => {
      expect(mockUpdateSelectedRole).toHaveBeenCalledWith(
        expect.objectContaining({
          role_id: "123",
          org_name: "Test Organization",
          org_code: "XYZ123",
          role_name: "Pharmacist"
        })
      )

      expect(screen.getByTestId("role-detail-page")).toBeInTheDocument()
    })
  })

  it("handles expired session by redirecting to login page", async () => {
    const headers = new AxiosHeaders({})
    mockUpdateSelectedRole.mockRejectedValue(new AxiosError(undefined, undefined, undefined, undefined,
      {
        status: 401,
        statusText: "Unauthorized",
        headers,
        config: {headers},
        data: {message: "Session expired or invalid. Please log in again.", restartLogin: true}
      }
    ))

    renderWithProviders({role: mockRole, link: mockLink})

    act(() => {
      const cardLink = screen.getByRole("link", {name: /test organization/i})
      fireEvent.click(cardLink)
    })

    await waitFor(() => {
      expect(screen.getByTestId("login-page-shown")).toBeInTheDocument()
    })
  })
})
