import React from "react"
import {render, screen} from "@testing-library/react"
import {MemoryRouter, Route, Routes} from "react-router-dom"
import YourSelectedRolePage from "@/pages/YourSelectedRolePage"
import {useAuth} from "@/context/AuthProvider"
import {YOUR_SELECTED_ROLE_STRINGS} from "@/constants/ui-strings/YourSelectedRoleStrings"
import userEvent from "@testing-library/user-event"

// Mock useAuth hook
jest.mock("@/context/AuthProvider")

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe("YourSelectedRolePage", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  function renderComponent() {
    return render(
      <MemoryRouter>
        <YourSelectedRolePage />
      </MemoryRouter>
    )
  }

  it("renders heading and subheading correctly", () => {
    mockedUseAuth.mockReturnValue({
      selectedRole: undefined,
      error: null,
      user: null,
      isSignedIn: false,
      isSigningIn: false,
      invalidSessionCause: undefined,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      hasNoAccess: false,
      hasSingleRoleAccess: false,
      userDetails: undefined,
      isConcurrentSession: false,
      cognitoSignIn: jest.fn(),
      cognitoSignOut: jest.fn(),
      clearAuthState: jest.fn(),
      updateSelectedRole: jest.fn(),
      forceCognitoLogout: jest.fn(),
      updateTrackerUserInfo: jest.fn()
    })

    renderComponent()

    expect(screen.getByTestId("eps_yourSelectedRole_page")).toHaveTextContent(YOUR_SELECTED_ROLE_STRINGS.heading)
    expect(screen.getByTestId("eps_yourSelectedRole_page")).toHaveTextContent(YOUR_SELECTED_ROLE_STRINGS.subheading)
  })

  it("renders the table with the correct role and organization data", () => {
    const selectedRole = {
      role_name: "Pharmacist",
      org_name: "Great Pharmacy",
      org_code: "GP123"
    }
    mockedUseAuth.mockReturnValue({
      selectedRole,
      error: null,
      user: null,
      isSignedIn: false,
      isSigningIn: false,
      invalidSessionCause: undefined,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      hasNoAccess: false,
      hasSingleRoleAccess: false,
      userDetails: undefined,
      isConcurrentSession: false,
      cognitoSignIn: jest.fn(),
      cognitoSignOut: jest.fn(),
      clearAuthState: jest.fn(),
      updateSelectedRole: jest.fn(),
      forceCognitoLogout: jest.fn(),
      updateTrackerUserInfo: jest.fn()
    })

    renderComponent()

    expect(screen.getByTestId("role-text")).toHaveTextContent("Pharmacist")
    expect(screen.getByTestId("org-text")).toHaveTextContent("Great Pharmacy (ODS: GP123)")
  })

  it("renders confirm button with correct text", () => {
    mockedUseAuth.mockReturnValue({
      selectedRole: undefined,
      error: null,
      user: null,
      isSignedIn: false,
      isSigningIn: false,
      invalidSessionCause: undefined,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      hasNoAccess: false,
      hasSingleRoleAccess: false,
      userDetails: undefined,
      isConcurrentSession: false,
      cognitoSignIn: jest.fn(),
      cognitoSignOut: jest.fn(),
      clearAuthState: jest.fn(),
      updateSelectedRole: jest.fn(),
      forceCognitoLogout: jest.fn(),
      updateTrackerUserInfo: jest.fn()
    })

    renderComponent()

    const button = screen.getByTestId("confirm-and-continue")
    expect(button).toHaveTextContent(YOUR_SELECTED_ROLE_STRINGS.confirmButtonText)
  })

  it("renders change role links correctly", () => {
    mockedUseAuth.mockReturnValue({
      selectedRole: undefined,
      error: null,
      user: null,
      isSignedIn: false,
      isSigningIn: false,
      invalidSessionCause: undefined,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      hasNoAccess: false,
      hasSingleRoleAccess: false,
      userDetails: undefined,
      isConcurrentSession: false,
      cognitoSignIn: jest.fn(),
      cognitoSignOut: jest.fn(),
      clearAuthState: jest.fn(),
      updateSelectedRole: jest.fn(),
      forceCognitoLogout: jest.fn(),
      updateTrackerUserInfo: jest.fn()
    })

    renderComponent()

    const roleChangeLink = screen.getByTestId("role-change-role-cell").querySelector("a")
    const orgChangeLink = screen.getByTestId("org-change-role-cell").querySelector("a")

    expect(roleChangeLink).toHaveAttribute("href", "/change-your-role")
    expect(orgChangeLink).toHaveAttribute("href", "/change-your-role")
  })

  it("navigates to /search-by-prescription-id when confirm button is clicked", async () => {
    mockedUseAuth.mockReturnValue({
      selectedRole: {role_name: "Pharmacist", org_name: "Org", org_code: "ORG1"},
      error: null,
      user: null,
      isSignedIn: false,
      isSigningIn: false,
      invalidSessionCause: undefined,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      hasNoAccess: false,
      hasSingleRoleAccess: false,
      userDetails: undefined,
      isConcurrentSession: false,
      cognitoSignIn: jest.fn(),
      cognitoSignOut: jest.fn(),
      clearAuthState: jest.fn(),
      updateSelectedRole: jest.fn(),
      forceCognitoLogout: jest.fn(),
      updateTrackerUserInfo: jest.fn()
    })

    // Setup MemoryRouter with initial entry at the page, and a dummy route for /search-by-prescription-id
    render(
      <MemoryRouter initialEntries={["/your-selected-role"]}>
        <Routes>
          <Route path="/your-selected-role" element={<YourSelectedRolePage />} />
          <Route path="/search-by-prescription-id" element={<div data-testid="search-page">Search Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    const button = screen.getByTestId("confirm-and-continue")
    await userEvent.click(button)

    // Assert the URL changed and that the new route content is rendered
    expect(screen.getByTestId("search-page")).toBeInTheDocument()
  })

  it("does not crash if selectedRole is undefined", () => {
    mockedUseAuth.mockReturnValue({
      selectedRole: undefined,
      error: null,
      user: null,
      isSignedIn: false,
      isSigningIn: false,
      invalidSessionCause: undefined,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      hasNoAccess: false,
      hasSingleRoleAccess: false,
      userDetails: undefined,
      isConcurrentSession: false,
      cognitoSignIn: jest.fn(),
      cognitoSignOut: jest.fn(),
      clearAuthState: jest.fn(),
      updateSelectedRole: jest.fn(),
      forceCognitoLogout: jest.fn(),
      updateTrackerUserInfo: jest.fn()
    })

    renderComponent()

    expect(screen.getByTestId("role-text")).toHaveTextContent(YOUR_SELECTED_ROLE_STRINGS.noRoleName)
    // eslint-disable-next-line max-len
    expect(screen.getByTestId("org-text")).toHaveTextContent(`${YOUR_SELECTED_ROLE_STRINGS.noOrgName} (ODS: ${YOUR_SELECTED_ROLE_STRINGS.noODSCode})`)
  })

})
