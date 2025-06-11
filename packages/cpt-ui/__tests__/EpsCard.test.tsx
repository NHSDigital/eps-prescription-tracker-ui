import "@testing-library/jest-dom"
import {render, screen, fireEvent} from "@testing-library/react"
import {BrowserRouter} from "react-router-dom"
import EpsCard from "@/components/EpsCard"
import {AuthContext, AuthContextType} from "@/context/AuthProvider"
import {AccessContext} from "@/context/AccessProvider"

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

// Mock useNavigate
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate
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
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  hasNoAccess: true,
  hasSingleRoleAccess: true,
  selectedRole: undefined,
  userDetails: undefined,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  updateSelectedRole: mockUpdateSelectedRole
}

const renderWithProviders = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: { role: any; link: string },
  // eslint-disable-next-line no-undef
  authOverrides: Partial<React.ContextType<typeof AuthContext>> = {}
) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const authValue = {
    ...defaultAuthContext,
    ...authOverrides
  // eslint-disable-next-line no-undef
  } as React.ContextType<typeof AuthContext>

  return render(
    <AuthContext.Provider value={authValue}>
      <AccessContext.Provider value={null}>
        <BrowserRouter>
          <EpsCard {...props} />
        </BrowserRouter>
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
    renderWithProviders(
      {role: mockRole, link: mockLink},
      {}
    )

    const cardLink = screen.getByRole("link", {name: /test organization/i})
    await fireEvent.click(cardLink)

    expect(mockUpdateSelectedRole).toHaveBeenCalledWith(
      expect.objectContaining({
        role_id: "123",
        org_name: "Test Organization",
        org_code: "XYZ123",
        role_name: "Pharmacist"
      })
    )

    expect(mockNavigate).toHaveBeenCalledWith(mockLink)
  })
})
