import React from "react"
import {render, screen} from "@testing-library/react"
import {MemoryRouter, Route, Routes} from "react-router-dom"
import YourSelectedRolePage from "@/pages/YourSelectedRolePage"
import {AuthContextType, useAuth} from "@/context/AuthProvider"
import {YOUR_SELECTED_ROLE_STRINGS} from "@/constants/ui-strings/YourSelectedRoleStrings"
import userEvent from "@testing-library/user-event"
import {FRONTEND_PATHS} from "@/constants/environment"

// Mock useAuth hook
jest.mock("@/context/AuthProvider")

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

const mockUseAuthReturnValue: AuthContextType = {
  selectedRole: undefined,
  error: null,
  user: null,
  isSignedIn: false,
  isSigningIn: false,
  invalidSessionCause: undefined,
  sessionId: undefined,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  userDetails: undefined,
  isConcurrentSession: false,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  hasSingleRoleAccess: jest.fn().mockReturnValue(false),
  updateSelectedRole: jest.fn(),
  updateTrackerUserInfo: jest.fn(),
  updateInvalidSessionCause: jest.fn(),
  isSigningOut: false,
  setIsSigningOut: jest.fn()
}

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
    mockedUseAuth.mockReturnValue(mockUseAuthReturnValue)

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
    mockedUseAuth.mockReturnValue({...mockUseAuthReturnValue, selectedRole})

    renderComponent()

    expect(screen.getByTestId("role-text")).toHaveTextContent("Pharmacist")
    expect(screen.getByTestId("org-text")).toHaveTextContent("Great Pharmacy (ODS: GP123)")
  })

  it("renders confirm button with correct text", () => {
    mockedUseAuth.mockReturnValue(mockUseAuthReturnValue)

    renderComponent()

    const button = screen.getByTestId("confirm-and-continue")
    expect(button).toHaveTextContent(YOUR_SELECTED_ROLE_STRINGS.confirmButtonText)
  })

  it("renders change role links correctly", () => {
    mockedUseAuth.mockReturnValue(mockUseAuthReturnValue)

    renderComponent()
    const changeLinks = screen.getAllByRole("link")
    const roleChangeLink = changeLinks.find(link =>
      link.closest('[data-testid="role-change-role-cell"]')
    )
    const orgChangeLink = changeLinks.find(link =>
      link.closest('[data-testid="org-change-role-cell"]')
    )
    expect(roleChangeLink).toHaveAttribute("href", FRONTEND_PATHS.CHANGE_YOUR_ROLE)
    expect(orgChangeLink).toHaveAttribute("href", FRONTEND_PATHS.CHANGE_YOUR_ROLE)
  })

  it("navigates to /search-by-prescription-id when confirm button is clicked", async () => {
    const selectedRole = {role_name: "Pharmacist", org_name: "Org", org_code: "ORG1"}
    mockedUseAuth.mockReturnValue({
      ...mockUseAuthReturnValue, selectedRole
    })

    // Setup MemoryRouter with initial entry at the page, and a dummy route for /search-by-prescription-id
    render(
      <MemoryRouter initialEntries={[FRONTEND_PATHS.YOUR_SELECTED_ROLE]}>
        <Routes>
          <Route path={FRONTEND_PATHS.YOUR_SELECTED_ROLE} element={<YourSelectedRolePage />} />
          <Route path={FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID}
            element={<div data-testid="search-page">Search Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    const button = screen.getByTestId("confirm-and-continue")
    await userEvent.click(button)

    // Assert the URL changed and that the new route content is rendered
    expect(screen.getByTestId("search-page")).toBeInTheDocument()
  })

  it("does not crash if selectedRole is undefined", () => {
    mockedUseAuth.mockReturnValue(mockUseAuthReturnValue)

    renderComponent()

    expect(screen.getByTestId("role-text")).toHaveTextContent(YOUR_SELECTED_ROLE_STRINGS.noRoleName)
    // eslint-disable-next-line max-len
    expect(screen.getByTestId("org-text")).toHaveTextContent(`${YOUR_SELECTED_ROLE_STRINGS.noOrgName} (ODS: ${YOUR_SELECTED_ROLE_STRINGS.noODSCode})`)
  })

})
