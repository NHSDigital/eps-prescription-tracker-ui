import "@testing-library/jest-dom"
import { render, screen, waitFor } from "@testing-library/react"
import { useRouter } from 'next/navigation'
import React from "react"

import { AuthContext } from "@/context/AuthProvider"

// Mock the card strings, so we have known text for the tests
jest.mock("@/constants/ui-strings/CardStrings", () => {
  const CHANGE_YOUR_ROLE_PAGE_TEXT = {
    title: "Change your role",
    caption: "Select the role you wish to use to access the service.",
    insetText: {
      visuallyHidden: "Information: ",
      message:
        "You are currently logged in at GREENE'S PHARMACY (ODS: FG419) with Health Professional Access Role.",
    },
    confirmButton: {
      text: "Continue to find a prescription",
      link: "tracker-presc-no",
    },
    alternativeMessage: "Alternatively, you can choose a new role below.",
    organisation: "Organisation",
    role: "Role",
    roles_without_access_table_title:
      "View your roles without access to the clinical prescription tracking service.",
    noOrgName: "NO ORG NAME",
    rolesWithoutAccessHeader: "Your roles without access",
    noODSCode: "No ODS code",
    noRoleName: "No role name",
    noAddress: "No address",
    errorDuringRoleSelection: "Error during role selection",
    loadingMessage: "Loading...",
  }


  const EPS_CARD_STRINGS = {
    noOrgName: "NO ORG NAME",
    noODSCode: "No ODS code",
    noRoleName: "No role name",
    noAddress: "Address not found"
  }


  return { CHANGE_YOUR_ROLE_PAGE_TEXT, EPS_CARD_STRINGS }
})

// Mock `next/navigation` to prevent errors during component rendering in test
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}))

// Create a global mock for `fetch` to simulate API requests
const mockFetch = jest.fn()
global.fetch = mockFetch

jest.mock("@/context/AccessProvider", () => {
  const React = require("react")

  const mockContextValue = {
    noAccess: false,
    singleAccess: false,
    selectedRole: {
      role_name: "role_name",
      role_id: "role_id",
      org_code: "org_code",
      org_name: "org_name",
      site_name: "site_name",
      site_address: "site_address",
      uuid: "uuid",
    },
    setNoAccess: jest.fn(),
    setSingleAccess: jest.fn(),
    setSelectedRole: jest.fn(),
  }

  const MockAccessContext = React.createContext(mockContextValue)
  const useAccess = () => React.useContext(MockAccessContext)

  return {
    __esModule: true,
    AccessContext: MockAccessContext,
    useAccess,
  }
})

// Default mock values for the `AuthContext` to simulate authentication state
const defaultAuthContext = {
  error: null, // No errors by default
  user: null, // User is initially null (not logged in)
  isSignedIn: false, // Default state is "not signed in"
  idToken: null, // No ID token available
  accessToken: null, // No access token available
  cognitoSignIn: jest.fn(), // Mock Cognito sign-in function
  cognitoSignOut: jest.fn(), // Mock Cognito sign-out function
}

import ChangeRolePage from "@/app/changerole/page"

// Utility function to render the component with custom AuthContext overrides
const renderWithAuth = (authOverrides = {}, accessOverrides = {}) => {
  const authValue = { ...defaultAuthContext, ...authOverrides }
  return render(
    <AuthContext.Provider value={authValue}>
      <ChangeRolePage />
    </AuthContext.Provider>
  )
}

import { CHANGE_YOUR_ROLE_PAGE_TEXT } from "@/constants/ui-strings/ChangeRolePageStrings";
import { EpsSpinnerStrings } from "../constants/ui-strings/EpsSpinnerStrings";

describe("ChangeRolePage", () => {
  // Clear all mock calls before each test to avoid state leaks
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders loading state when signed in but fetch hasn't resolved yet", async () => {
    // Mock fetch to hang indefinitely, simulating a pending request
    mockFetch.mockImplementation(() => new Promise(() => { }))

    // Render the page with user signed in
    renderWithAuth({ isSignedIn: true, idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } })

    // Verify that the loading text appears
    const loadingText = screen.getByText(EpsSpinnerStrings.loading);
    expect(loadingText).toBeInTheDocument();
  });

  it("renders error summary if fetch returns non-200 status", async () => {
    // Mock fetch to return a 500 status code (server error)
    mockFetch.mockResolvedValue({ status: 500 })

    // Render the page with user signed in
    renderWithAuth({ isSignedIn: true, idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } })

    // Wait for the error message to appear
    await waitFor(() => {
      // Check for error summary heading
      const errorHeading = screen.getByRole("heading", {
        name: CHANGE_YOUR_ROLE_PAGE_TEXT.errorDuringRoleSelection,
      })
      expect(errorHeading).toBeInTheDocument()

      // Check for specific error text
      const errorItem = screen.getByText("Failed to fetch CPT user info")
      expect(errorItem).toBeInTheDocument()
    })
  })

  it("renders error summary if fetch returns 200 but no userInfo is present", async () => {
    // Mock fetch to return 200 OK but with an empty JSON body
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({}), // No `userInfo` key in response
    })

    // Render the page with user signed in
    renderWithAuth({ isSignedIn: true, idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } })

    // Wait for the error message to appear
    await waitFor(() => {
      // Check for error summary heading
      const errorHeading = screen.getByRole("heading", {
        name: CHANGE_YOUR_ROLE_PAGE_TEXT.errorDuringRoleSelection,
      })
      expect(errorHeading).toBeInTheDocument()

      // Check for specific error text
      const errorItem = screen.getByText("Failed to fetch CPT user info")
      expect(errorItem).toBeInTheDocument()
    })
  })

  it("renders the page content when valid userInfo is returned", async () => {
    // Mock user data to simulate valid API response
    const mockUserInfo = {
      roles_with_access: [
        {
          role_name: "Pharmacist",
          org_name: "Test Pharmacy Org",
          org_code: "ORG123",
          site_address: "1 Fake Street",
        },
      ],
      roles_without_access: [
        {
          role_name: "Technician",
          org_name: "Tech Org",
          org_code: "ORG456",
          site_address: "2 Fake Street",
        },
      ],
    }

    // Mock fetch to return 200 OK with valid userInfo
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ userInfo: mockUserInfo }),
    })

    // Render the page with user signed in
    renderWithAuth({ isSignedIn: true, idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } })

    // Wait for the main content to load
    await waitFor(() => {
      // Check for the page heading
      const heading = screen.getByRole("heading", { level: 1 })
      expect(heading).toHaveTextContent(CHANGE_YOUR_ROLE_PAGE_TEXT.title)
    })

    // Verify the page caption
    const caption = screen.getByText(CHANGE_YOUR_ROLE_PAGE_TEXT.caption)
    expect(caption).toBeInTheDocument()

    // Verify the "Roles without access" section (expander)
    const expanderText = CHANGE_YOUR_ROLE_PAGE_TEXT.roles_without_access_table_title
    const expander = screen.getByText(expanderText)
    expect(expander).toBeInTheDocument()

    // Check for the table data in "Roles without access"
    const tableOrg = screen.getByText(/Tech Org \(ODS: ORG456\)/i)
    expect(tableOrg).toBeInTheDocument()
    const tableRole = screen.getByText("Technician")
    expect(tableRole).toBeInTheDocument()
  })

  it("renders error summary when not signed in", async () => {
    // Render the page with `isSignedIn` set to false
    renderWithAuth({ isSignedIn: false, error: "Missing access or ID token" })

    // Wait for the error message to appear
    await waitFor(() => {
      // Check for error summary heading
      const errorHeading = screen.getByRole("heading", {
        name: CHANGE_YOUR_ROLE_PAGE_TEXT.errorDuringRoleSelection,
      })
      expect(errorHeading).toBeInTheDocument()

      const errorItem = screen.getByText("Missing access or ID token")
      expect(errorItem).toBeInTheDocument()
    })
  })

  it("redirects to searchforaprescription when there is one role with access and no roles without access", async () => {
    const mockUserInfo = {
      roles_with_access: [
        {
          role_name: "Pharmacist",
          org_name: "Test Pharmacy Org",
          org_code: "ORG123",
          site_address: "1 Fake Street",
        },
      ],
      roles_without_access: [],
    }

    // Mock fetch to return 200 OK with valid userInfo
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ userInfo: mockUserInfo }),
    })

    // Render the page with user signed in
    renderWithAuth({ isSignedIn: true, idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } })

    // Mock useRouter's push function
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })

    // Render the page with user signed in
    renderWithAuth({ isSignedIn: true, idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } })

    // Wait for redirection
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/searchforaprescription")
    })
  })
})
