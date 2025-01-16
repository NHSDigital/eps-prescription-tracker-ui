import "@testing-library/jest-dom"
import { render, screen, waitFor } from "@testing-library/react"
import { useRouter } from 'next/navigation'
import React from "react"
import SelectYourRolePage from "@/app/selectyourrole/page"
import { AuthContext } from "@/context/AuthProvider"

// Mock the module and directly reference the variable
jest.mock("@/constants/ui-strings/CardStrings", () => {
  const SELECT_YOUR_ROLE_PAGE_TEXT = {
    title: "Select your role",
    caption: "Select the role you wish to use to access the service.",
    titleNoAccess: "No access to the clinical prescription tracking service",
    captionNoAccess:
      "None of the roles on your Smartcard or other authenticators allow you to access the clinical prescription tracking service. " +
      "Contact your Registration Authority representative to obtain the correct code.",
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

  return { SELECT_YOUR_ROLE_PAGE_TEXT }
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

  var mockContextValue = {
    noAccess: false,
    singleAccess: false,
    selectedRole: "PLACEHOLDER",
    setNoAccess: jest.fn(),
    setSingleAccess: jest.fn(),
    setSelectedRole: jest.fn(),
  }

  const MockAccessContext = React.createContext(mockContextValue)
  const useAccess = () => React.useContext(MockAccessContext)

  const __setMockContextValue = (newValue: any) => {
    mockContextValue = { ...mockContextValue, ...newValue }
    // Reassign the context’s defaultValue so subsequent consumers get the new values
    MockAccessContext._currentValue = mockContextValue
    MockAccessContext._currentValue2 = mockContextValue
  }

  return {
    __esModule: true,
    AccessContext: MockAccessContext,
    useAccess,
    __setMockContextValue
  }
})
// import the setter
const { __setMockContextValue } = require("@/context/AccessProvider");

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

export const renderWithAuth = (authOverrides = {}) => {
  const authValue = { ...defaultAuthContext, ...authOverrides }

  return render(
    <AuthContext.Provider value={authValue}>
      <SelectYourRolePage />
    </AuthContext.Provider>
  )
}

import { SELECT_YOUR_ROLE_PAGE_TEXT } from "@/constants/ui-strings/CardStrings";
import { EpsSpinnerStrings } from "../constants/ui-strings/EpsSpinnerStrings";

describe("SelectYourRolePage", () => {
  // Clear all mock calls before each test to avoid state leaks
  beforeEach(() => {
    jest.clearAllMocks()
    __setMockContextValue({
      noAccess: false,
    });
  })

  it("renders loading state when signed in but fetch hasn't resolved yet", async () => {
    // Mock fetch to hang indefinitely, simulating a pending request
    mockFetch.mockImplementation(() => new Promise(() => { }))

    // Render the page with user signed in
    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") }
    })

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
      const errorHeading = screen.getByRole("heading", {
        name: SELECT_YOUR_ROLE_PAGE_TEXT.errorDuringRoleSelection,
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
        name: SELECT_YOUR_ROLE_PAGE_TEXT.errorDuringRoleSelection,
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
      expect(heading).toHaveTextContent(SELECT_YOUR_ROLE_PAGE_TEXT.title)
    })
  })

  it("renders no access title and caption when no roles with access are available", async () => {
    // Mock user data with no roles with access
    const mockUserInfo = {
      roles_with_access: [], // No roles with access
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
    __setMockContextValue({ noAccess: true })
    renderWithAuth({ isSignedIn: true, idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } })

    // Wait for the main content to load
    await waitFor(() => {
      // Check for the no-access title
      const heading = screen.getByRole("heading", { level: 1 })
      expect(heading).toHaveTextContent(
        SELECT_YOUR_ROLE_PAGE_TEXT.titleNoAccess
      )
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

    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ userInfo: mockUserInfo }),
    })

    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })

    renderWithAuth({ isSignedIn: true, idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/searchforaprescription")
    })
  })
})
