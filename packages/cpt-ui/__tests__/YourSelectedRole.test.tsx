import "@testing-library/jest-dom"
import {render, screen, fireEvent} from "@testing-library/react"
import {useNavigate} from "react-router-dom"
import React from "react"
import YourSelectedRolePage from "@/pages/YourSelectedRolePage"
import {AuthContext, AuthContextType} from "@/context/AuthProvider"
import {AccessContext} from "@/context/AccessProvider"
import {FRONTEND_PATHS} from "@/constants/environment"

const {
  YOUR_SELECTED_ROLE_STRINGS
  // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
} = require("@/constants/ui-strings/YourSelectedRoleStrings")

// Mock `react-router-dom`
jest.mock("react-router-dom", () => ({
  useLocation: jest.fn(),
  useNavigate: jest.fn(),
  Link: ({children, to}: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  )
}))

// Default mock values for contexts
const defaultAuthContext: AuthContextType = {
  error: null,
  user: null,
  isSignedIn: true,
  isSigningIn: false,
  selectedRole: {
    role_name: "Role Name",
    role_id: "role-id",
    org_code: "deadbeef",
    org_name: "org name"
  },
  userDetails: {
    given_name: "Jane",
    family_name: "Doe"
  },
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  noAccess: false,
  singleAccess: false,

  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  updateSelectedRole: jest.fn(),
  clearAuthState: jest.fn()
}

const renderWithProviders = (authOverrides = {}) => {
  const authValue = {...defaultAuthContext, ...authOverrides}

  return render(
    <AuthContext.Provider value={authValue}>
      <AccessContext.Provider value={null}>
        <YourSelectedRolePage />
      </AccessContext.Provider>
    </AuthContext.Provider>
  )
}

describe.skip("YourSelectedRolePage", () => {
  let mockNavigate: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate)
  })

  it("renders the heading and subheading correctly", () => {
    renderWithProviders()
    const heading = screen.getByRole("heading", {
      level: 1,
      name: /Your selected role/i
    })
    const subheading = screen.getByText(/The following role is now active/i)

    expect(heading).toBeInTheDocument()
    expect(subheading).toBeInTheDocument()
  })

  it("renders the table with the correct role and organization data", () => {
    renderWithProviders()
    // Role row
    expect(screen.getByTestId("role-label")).toHaveTextContent("Role")
    expect(screen.getByTestId("role-text")).toHaveTextContent("Role Name")

    // Org row
    expect(screen.getByTestId("org-label")).toHaveTextContent("Organisation")
    expect(screen.getByTestId("org-text")).toHaveTextContent(
      "org name (ODS: deadbeef)"
    )
  })

  it("has valid Change links for role and organization", () => {
    renderWithProviders()

    const changeLinks = screen.getAllByRole("link", {name: /Change/i})
    expect(changeLinks).toHaveLength(2) // one for role, one for org

    changeLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/change-your-role")
    })
  })

  it("navigates to /search-by-prescription-id when the confirm button is clicked", async () => {
    renderWithProviders()
    const button = screen.getByTestId("confirm-and-continue")
    await fireEvent.click(button)
    expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
  })

  it("does not crash if selectedRole is undefined", () => {
    renderWithProviders({})

    const heading = screen.queryByText("Your selected role")
    expect(heading).toBeInTheDocument()

    const roleTextCell = screen.getByTestId("role-text")
    expect(roleTextCell).toHaveTextContent(
      YOUR_SELECTED_ROLE_STRINGS.noRoleName
    )

    const orgTextCell = screen.getByTestId("org-text")
    expect(orgTextCell).toHaveTextContent(
      `${YOUR_SELECTED_ROLE_STRINGS.noOrgName} (ODS: ${YOUR_SELECTED_ROLE_STRINGS.noODSCode})`
    )
  })
})
