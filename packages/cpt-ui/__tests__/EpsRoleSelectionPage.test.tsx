import React from "react"
import {
  render,
  screen,
  fireEvent,
  act
} from "@testing-library/react"
import RoleSelectionPage from "@/components/EpsRoleSelectionPage"
import {useAuth} from "@/context/AuthProvider"
import {useNavigate} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {getSearchParams} from "@/helpers/getSearchParams"

jest.mock("@/context/AuthProvider")
jest.mock("@/helpers/getSearchParams")
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn()
}))

const mockUseAuth = useAuth as jest.Mock
const mockGetSearchParams = getSearchParams as jest.Mock

const defaultContentText = {
  title: "Select your role",
  caption: "Choose a role to continue",
  titleNoAccess: "You do not have access",
  captionNoAccess: "Please contact support.",
  insetText: {
    visuallyHidden: "Info:",
    message: "You are logged in as"
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
      hasNoAccess: false,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      error: null,
      clearAuthState: jest.fn()
    })
    mockGetSearchParams.mockReturnValue({
      codeParams: "foo",
      stateParams: "bar"
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)
    expect(screen.getByRole("main")).toHaveTextContent("Loading")
  })

  it("renders error message if auth.error exists", () => {
    mockUseAuth.mockReturnValue({
      isSigningIn: false,
      hasNoAccess: false,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      error: "Something went wrong"
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)
    expect(screen.getByText("There was an error selecting your role")).toBeInTheDocument()
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
  })

  it("renders titleNoAccess and captionNoAccess when hasNoAccess is true", () => {
    mockUseAuth.mockReturnValue({
      isSigningIn: false,
      hasNoAccess: true,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      error: null
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)
    expect(screen.getByText("You do not have access")).toBeInTheDocument()
    expect(screen.getByText("Please contact support.")).toBeInTheDocument()
  })

  it("redirects to login if logging in but not in callback", () => {
    const navigateMock = jest.fn()
    mockNavigate.mockReturnValue(navigateMock)

    mockUseAuth.mockReturnValue({
      isSigningIn: true,
      isSignedIn: false,
      hasSingleRoleAccess: true,
      hasNoAccess: false,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      selectedRole: null,
      error: null,
      clearAuthState: jest.fn()
    })
    mockGetSearchParams.mockReturnValue({
      codeParams: undefined,
      stateParams: undefined
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)

    expect(navigateMock).toHaveBeenCalledWith(FRONTEND_PATHS.LOGIN)
  })

  it("redirects if user hasSingleRoleAccess", () => {
    const navigateMock = jest.fn()
    mockNavigate.mockReturnValue(navigateMock)

    mockUseAuth.mockReturnValue({
      isSigningIn: false,
      isSignedIn: true,
      hasSingleRoleAccess: true,
      hasNoAccess: false,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      selectedRole: null,
      error: null
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)

    expect(navigateMock).toHaveBeenCalledWith(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
  })

  it("renders login info when selectedRole is present", () => {
    mockUseAuth.mockReturnValue({
      isSigningIn: false,
      hasSingleRoleAccess: false,
      hasNoAccess: false,
      selectedRole: {
        org_name: "Test Org",
        org_code: "TEST123",
        role_name: "Pharmacist",
        role_id: "1"
      },
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      error: null
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)

    expect(screen.getByText(/You are currently logged in at/)).toBeInTheDocument()
    expect(screen.getByTestId("confirm-and-continue")).toBeInTheDocument()
  })

  it("renders roles without access in table", () => {
    mockUseAuth.mockReturnValue({
      isSigningIn: false,
      hasNoAccess: false,
      rolesWithAccess: [],
      rolesWithoutAccess: [
        {
          role_name: "Admin",
          org_name: "No Access Org",
          org_code: "NO123"
        }
      ],
      error: null
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
      hasNoAccess: false,
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
      error: null
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
      hasNoAccess: false,
      selectedRole: {
        role_id: "1",
        org_name: "Pharmacy A",
        org_code: "PHA123",
        role_name: "Pharmacist"
      },
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      error: null
    })

    render(<RoleSelectionPage contentText={defaultContentText} />)

    const button = screen.getByTestId("confirm-and-continue")
    expect(button).toBeInTheDocument()
    expect(button).toBeEnabled()
    fireEvent.click(button)

    expect(mockNavigate.mock.calls.length).toBe(5)
    expect(mockNavigate).toHaveBeenCalledWith("/continue")
  })

  it("transitions from spinner to success path", () => {
    // Step 1: isSigningIn = true, so spinner shows
    const authState = {
      isSigningIn: true,
      isSignedIn: true,
      hasSingleRoleAccess: false,
      hasNoAccess: false,
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      selectedRole: null,
      error: null,
      clearAuthState: jest.fn()
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
    expect(screen.getByRole("main")).toHaveTextContent("Loading")

    // Step 2: Simulate login complete and role assignment
    act(() => {
      authState.isSigningIn = false
      authState.hasSingleRoleAccess = true
      authState.isSignedIn = true
      mockUseAuth.mockReturnValue(authState)
    })

    rerender(<RoleSelectionPage contentText={defaultContentText} />)
    expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
  })
})
