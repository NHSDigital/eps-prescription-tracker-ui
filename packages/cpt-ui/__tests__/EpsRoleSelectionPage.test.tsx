import React from "react"
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor
} from "@testing-library/react"
import RoleSelectionPage from "@/components/EpsRoleSelectionPage"
import {useAuth} from "@/context/AuthProvider"
import {useNavigate} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {getSearchParams} from "@/helpers/getSearchParams"
import {handleRestartLogin, signOut} from "@/helpers/logout"
import axios from "axios"
import {RoleDetails} from "@cpt-ui-common/common-types"
import {AuthContextType} from "@/context/AuthProvider"
import {mockAuthState} from "./mocks/AuthStateMock"

jest.mock("@/context/AuthProvider")
jest.mock("@/helpers/getSearchParams")
jest.mock("@/helpers/logout", () => ({
  handleRestartLogin: jest.fn(),
  signOut: jest.fn().mockImplementation((auth: AuthContextType) => {
    auth.isSigningOut = true
  })
}))
jest.mock("@/helpers/axios", () => ({
  __esModule: true,
  default: {
    interceptors: {
      request: {use: jest.fn()},
      response: {use: jest.fn()}
    }
  }
}))
jest.mock("axios", () => ({
  isAxiosError: jest.fn(),
  create: jest.fn(() => ({
    interceptors: {
      request: {use: jest.fn()},
      response: {use: jest.fn()}
    }
  }))
}))
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn()
}))

const mockUseAuth = useAuth as jest.Mock
const mockGetSearchParams = getSearchParams as jest.Mock

const defaultContentText = {
  pageTitle: "Test Page Title",
  title: "Select your role",
  caption: "Choose a role to continue",
  titleNoAccess: "You do not have access",
  captionNoAccess: "Please contact support.",
  insetText: {
    visuallyHidden: "Info:",
    message: "You are logged in as",
    loggedInTemplate: "You are currently logged in at {orgName} (ODS: {odsCode}) with {roleName}."
  },
  confirmButton: {
    link: "/continue",
    text: "Confirm and continue"
  },
  alternativeMessage: "If this is incorrect, choose a different role.",
  organisation: "Organisation",
  role: "Role",
  roles_without_access_table_title: "Roles without access",
  noOrgName: "No Org",
  rolesWithoutAccessHeader: "You can't access these roles",
  noODSCode: "No ODS",
  noRoleName: "No Role",
  noAddress: "No Address",
  errorDuringRoleSelection: "There was an error selecting your role"
}

describe("RoleSelectionPage", () => {
  const mockNavigate = useNavigate as jest.Mock
  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {})
    jest.spyOn(console, "warn").mockImplementation(() => {})

  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()
    ;(useNavigate as jest.Mock).mockReturnValue(mockNavigate)
  })

  afterEach(() => {
    //windowSpy.mockRestore()
  })

  it("renders loading spinner if redirecting during sign in", () => {
    mockUseAuth.mockReturnValue({
      isSigningIn: true,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      error: null,
      clearAuthState: jest.fn(),
      hasSingleRoleAccess: jest.fn().mockReturnValue(false)
    })
    mockGetSearchParams.mockReturnValue({
      codeParams: "foo",
      stateParams: "bar"
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)
    expect(screen.getByRole("heading", {name: "Loading"})).toBeInTheDocument()
  })

  it("renders error message if auth.error exists", () => {
    mockUseAuth.mockReturnValue({
      isSigningIn: false,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      error: "Something went wrong",
      hasSingleRoleAccess: jest.fn().mockReturnValue(false)
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)
    expect(screen.getByText("There was an error selecting your role")).toBeInTheDocument()
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
  })

  it("renders titleNoAccess and captionNoAccess when rolesWithAccess is empty", () => {
    mockUseAuth.mockReturnValue({
      isSigningIn: false,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      error: null,
      hasSingleRoleAccess: jest.fn().mockReturnValue(false)
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)
    expect(screen.getByText("You do not have access")).toBeInTheDocument()
    expect(screen.getByText("Please contact support.")).toBeInTheDocument()
  })

  it("redirects to login if logging in but not in callback", async () => {
    const navigateMock = jest.fn()
    mockNavigate.mockReturnValue(navigateMock)
    const authState = {
      ...mockAuthState,
      isSigningIn: true
    }
    mockUseAuth.mockReturnValue(authState)
    mockGetSearchParams.mockReturnValue({
      codeParams: undefined,
      stateParams: undefined
    })

    const {rerender} = render(
      <RoleSelectionPage contentText={defaultContentText} />
    )

    // Mock signOut to update the authState AND refresh the mock
    ;(signOut as jest.Mock).mockImplementation((authState: AuthContextType) => {
      authState.isSigningOut = true
      mockUseAuth.mockReturnValue(authState) // Update what useAuth returns
    })

    await act(async () => {
      signOut(authState)
    })

    // Rerender to pick up the new auth state
    rerender(<RoleSelectionPage contentText={defaultContentText} />)

    expect(screen.getByRole("heading", {name: "Loading"})).toBeInTheDocument()
  })

  it("redirects if user has single roleWithAccess", () => {
    const navigateMock = jest.fn()
    mockNavigate.mockReturnValue(navigateMock)

    mockUseAuth.mockReturnValue({
      isSigningIn: false,
      isSignedIn: true,
      rolesWithAccess: [
        {
          role_id: "1",
          role_name: "Pharmacist",
          org_code: "ABC",
          org_name: "Pharmacy Org"
        }
      ],
      rolesWithoutAccess: [],
      selectedRole: null,
      error: null,
      hasSingleRoleAccess: jest.fn().mockReturnValue(true)
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)

    expect(navigateMock).toHaveBeenCalledWith(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
  })

  it("renders login info when selectedRole is present", () => {
    mockUseAuth.mockReturnValue({
      isSigningIn: false,
      selectedRole: {
        org_name: "Test Org",
        org_code: "TEST123",
        role_name: "Pharmacist",
        role_id: "1"
      },
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      error: null,
      hasSingleRoleAccess: jest.fn().mockReturnValue(false)
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)

    expect(screen.getByText(/You are currently logged in at/)).toBeInTheDocument()
    expect(screen.getByTestId("confirm-and-continue")).toBeInTheDocument()
  })

  it("renders roles without access in table", () => {
    mockUseAuth.mockReturnValue({
      isSigningIn: false,
      rolesWithAccess: [],
      rolesWithoutAccess: [
        {
          role_name: "Admin",
          org_name: "No Access Org",
          org_code: "NO123"
        }
      ],
      error: null,
      hasSingleRoleAccess: jest.fn().mockReturnValue(false)
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)
    expect(screen.getByText("You can't access these roles")).toBeInTheDocument()
    expect(screen.getByText("Roles without access")).toBeInTheDocument()
    expect(screen.getByText("No Access Org (ODS: NO123)")).toBeInTheDocument()
    expect(screen.getByText("Admin")).toBeInTheDocument()
  })

  it("renders EpsCard components for roles with access", () => {
    mockUseAuth.mockReturnValue({
      isSigningIn: false,
      selectedRole: {
        role_id: "1"
      },
      rolesWithAccess: [
        {
          role_id: "2",
          role_name: "Pharmacist",
          org_code: "ABC",
          org_name: "Pharmacy Org"
        },
        {
          role_id: "3",
          role_name: "Technician",
          org_code: "XYZ",
          org_name: "Tech Org"
        },
        {
          role_id: "1", // this one should be filtered out
          role_name: "Admin",
          org_code: "ZZZ",
          org_name: "Same Org"
        }
      ],
      rolesWithoutAccess: [],
      error: null,
      hasSingleRoleAccess: jest.fn().mockReturnValue(false)
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)

    // Should only render 2 EpsCards (excluding selectedRole)
    const cards = screen.getAllByTestId("eps-card")
    expect(cards).toHaveLength(2)
    expect(screen.queryByText("Pharmacist")).toBeInTheDocument()
    expect(screen.queryByText("Technician")).toBeInTheDocument()
    expect(screen.queryByText("Admin")).not.toBeInTheDocument()
  })

  it("navigates on confirm and continue button click", async () => {
    mockUseAuth.mockReturnValue({
      isSigningIn: false,
      selectedRole: {
        role_id: "1",
        org_name: "Pharmacy A",
        org_code: "PHA123",
        role_name: "Pharmacist"
      },
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      error: null,
      hasSingleRoleAccess: jest.fn().mockReturnValue(false)
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)

    const button = screen.getByTestId("confirm-and-continue")
    expect(button).toBeInTheDocument()
    expect(button).toBeEnabled()
    fireEvent.click(button)

    expect(mockNavigate).toHaveBeenCalledWith("/continue")
  })

  it("transitions from spinner to success path", () => {
    // Step 1: isSigningIn = true, so spinner shows
    const authState = {
      isSigningIn: true,
      isSignedIn: false,
      rolesWithAccess: [] as Array<RoleDetails>,
      rolesWithoutAccess: [],
      selectedRole: undefined as RoleDetails | undefined,
      error: null,
      clearAuthState: jest.fn(),
      hasSingleRoleAccess: jest.fn().mockReturnValue(false)
    }

    mockUseAuth.mockReturnValue(authState)
    mockGetSearchParams.mockReturnValue({
      codeParams: "foo",
      stateParams: "bar"
    })
    const {rerender} = render(
      <RoleSelectionPage contentText={defaultContentText} />
    )

    rerender(<RoleSelectionPage contentText={defaultContentText} />)
    expect(screen.getByRole("heading", {name: "Loading"})).toBeInTheDocument()

    // Step 2: Simulate login complete and role assignment
    act(() => {
      authState.isSigningIn = false
      const role = {
        role_id: "2",
        role_name: "Pharmacist",
        org_code: "ABC",
        org_name: "Pharmacy Org"
      }
      authState.rolesWithAccess = [role]
      authState.selectedRole = role
      authState.isSignedIn = true
      mockUseAuth.mockReturnValue(authState)
      authState.hasSingleRoleAccess = jest.fn().mockReturnValue(true)
    })

    rerender(<RoleSelectionPage contentText={defaultContentText} />)
    expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
  })

  describe("Role Card Interactions", () => {
    const mockUpdateSelectedRole = jest.fn()
    const roleWithAccess = {
      role_id: "2",
      role_name: "Pharmacist",
      org_code: "ABC123",
      org_name: "Test Pharmacy",
      site_address: "123 Test Street\nTest City\nTE1 2ST"
    }

    beforeEach(() => {
      jest.clearAllMocks()
      mockUseAuth.mockReturnValue({
        isSigningIn: false,
        hasNoAccess: false,
        selectedRole: null,
        rolesWithAccess: [roleWithAccess],
        rolesWithoutAccess: [],
        error: null,
        updateSelectedRole: mockUpdateSelectedRole,
        hasSingleRoleAccess: jest.fn().mockReturnValue(false)
      })
    })

    it("renders card with correct organization name and ODS code", () => {
      render(<RoleSelectionPage contentText={defaultContentText} />)

      expect(screen.getByText(/Test Pharmacy/)).toBeInTheDocument()
      expect(screen.getByText(/ABC123/)).toBeInTheDocument()
      expect(screen.getByText("Pharmacist")).toBeInTheDocument()
    })

    it("renders address information correctly", () => {
      render(<RoleSelectionPage contentText={defaultContentText} />)

      expect(screen.getByText("123 Test Street")).toBeInTheDocument()
      expect(screen.getByText("Test City")).toBeInTheDocument()
      expect(screen.getByText("TE1 2ST")).toBeInTheDocument()
    })

    it("handles click on role card", async () => {
      render(<RoleSelectionPage contentText={defaultContentText} />)

      const card = screen.getByTestId("eps-card")
      expect(card).toBeInTheDocument()

      await act(async () => {
        fireEvent.click(card)
      })

      await waitFor(() => {
        expect(mockUpdateSelectedRole).toHaveBeenCalledWith(roleWithAccess)
        expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.YOUR_SELECTED_ROLE)
      })
    })

    it("handles Enter key press on role card", async () => {
      render(<RoleSelectionPage contentText={defaultContentText} />)

      const card = screen.getByTestId("eps-card")
      expect(card).toBeInTheDocument()

      await act(async () => {
        fireEvent.keyDown(card, {key: "Enter"})
      })

      await waitFor(() => {
        expect(mockUpdateSelectedRole).toHaveBeenCalledWith(roleWithAccess)
        expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.YOUR_SELECTED_ROLE)
      })
    })

    it("handles Space key press on role card", async () => {
      render(<RoleSelectionPage contentText={defaultContentText} />)

      const card = screen.getByTestId("eps-card")
      expect(card).toBeInTheDocument()

      await act(async () => {
        fireEvent.keyDown(card, {key: " "})
      })

      await waitFor(() => {
        expect(mockUpdateSelectedRole).toHaveBeenCalledWith(roleWithAccess)
        expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.YOUR_SELECTED_ROLE)
      })
    })

    it("ignores other key presses on role card", async () => {
      render(<RoleSelectionPage contentText={defaultContentText} />)

      const card = screen.getByTestId("eps-card")
      expect(card).toBeInTheDocument()

      mockNavigate.mockClear()
      mockUpdateSelectedRole.mockClear()

      await act(async () => {
        fireEvent.keyDown(card, {key: "Tab"})
      })

      expect(mockUpdateSelectedRole).not.toHaveBeenCalled()
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it("handles 401 error during role selection", async () => {
      const mockAxiosError = {
        response: {
          status: 401,
          data: {invalidSessionCause: "session_expired"}
        }
      }

      jest.spyOn(axios, "isAxiosError").mockReturnValueOnce(true)

      mockUpdateSelectedRole.mockRejectedValue(mockAxiosError)

      render(<RoleSelectionPage contentText={defaultContentText} />)

      const card = screen.getByTestId("eps-card")

      await act(async () => {
        fireEvent.click(card)
      })

      await waitFor(() => {
        expect(handleRestartLogin).toHaveBeenCalledWith(
          expect.objectContaining({updateSelectedRole: mockUpdateSelectedRole}),
          "session_expired"
        )
      })
    })

    it("logs general errors during role selection", async () => {
      const mockError = new Error("Network error")

      jest.spyOn(axios, "isAxiosError").mockReturnValueOnce(false)

      mockUpdateSelectedRole.mockRejectedValue(mockError)

      render(<RoleSelectionPage contentText={defaultContentText} />)

      const card = screen.getByTestId("eps-card")

      await act(async () => {
        fireEvent.click(card)
      })

      await waitFor(() => {
        expect(mockUpdateSelectedRole).toHaveBeenCalledWith(roleWithAccess)
      })
    })

    it("applies correct CSS classes to card elements", () => {
      render(<RoleSelectionPage contentText={defaultContentText} />)

      const card = screen.getByTestId("eps-card")
      expect(card).toHaveClass("nhsuk-card", "nhsuk-card--primary", "nhsuk-u-margin-bottom-4")
      expect(card).toHaveAttribute("tabIndex", "0")

      const heading = screen.getByRole("heading", {name: /Test Pharmacy/})
      expect(heading).toHaveClass("nhsuk-heading-s", "eps-card__org-name")
    })

    it("renders fallback text for missing role data", () => {
      const incompleteRole = {
        role_id: "3",
        role_name: null,
        org_code: null,
        org_name: null,
        site_address: null
      }

      mockUseAuth.mockReturnValue({
        isSigningIn: false,
        hasNoAccess: false,
        selectedRole: null,
        rolesWithAccess: [incompleteRole],
        rolesWithoutAccess: [],
        error: null,
        updateSelectedRole: mockUpdateSelectedRole,
        hasSingleRoleAccess: jest.fn().mockReturnValue(false)
      })

      render(<RoleSelectionPage contentText={defaultContentText} />)

      expect(screen.getByText(/No Org/)).toBeInTheDocument()
      expect(screen.getByText(/No ODS/)).toBeInTheDocument()
      expect(screen.getByText("No Role")).toBeInTheDocument()
      expect(screen.getByText("No Address")).toBeInTheDocument()
    })

    it("filters out selected role from available roles", () => {
      const selectedRole = {
        role_id: "1",
        role_name: "Admin",
        org_code: "ADMIN",
        org_name: "Admin Org"
      }

      mockUseAuth.mockReturnValue({
        isSigningIn: false,
        hasNoAccess: false,
        selectedRole: selectedRole,
        rolesWithAccess: [selectedRole, roleWithAccess],
        rolesWithoutAccess: [],
        error: null,
        updateSelectedRole: mockUpdateSelectedRole,
        hasSingleRoleAccess: jest.fn().mockReturnValue(false)
      })

      render(<RoleSelectionPage contentText={defaultContentText} />)

      expect(screen.getByText(/Test Pharmacy/)).toBeInTheDocument()
      expect(screen.queryByText("Admin Org")).not.toBeInTheDocument()

      const cards = screen.getAllByTestId("eps-card")
      expect(cards).toHaveLength(1)
    })
  })
  describe("Loading Page Interactions", () => {
    it("Render loading when user clicks signout", async () => {
      const authState = {
        ...mockAuthState,
        isSignedIn: true
      }
      mockUseAuth.mockReturnValue(authState)
      const {rerender} = render(
        <RoleSelectionPage contentText={defaultContentText} />
      )

      // Mock signOut to update the authState AND refresh the mock
      ;(signOut as jest.Mock).mockImplementation((authState: AuthContextType) => {
        authState.isSigningOut = true
        mockUseAuth.mockReturnValue(authState) // Update what useAuth returns
      })

      await act(async () => {
        signOut(authState)
      })

      // Rerender to pick up the new auth state
      rerender(<RoleSelectionPage contentText={defaultContentText} />)

      expect(screen.getByRole("heading", {name: "Loading"})).toBeInTheDocument()
    })
  })
})
