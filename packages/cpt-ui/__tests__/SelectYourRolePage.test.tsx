import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import SelectYourRolePage from "@/pages/SelectYourRolePage";
import { AuthContext } from "@/context/AuthProvider";
import { useNavigate } from "react-router-dom";

import axios from "@/helpers/axios";
jest.mock("@/helpers/axios");

// Tell TypeScript that axios is a mocked version.
const mockedAxios = axios as jest.Mocked<typeof axios>;

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
      link: "searchforaprescription",
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
  };

  const EPS_CARD_STRINGS = {
    noOrgName: "NO ORG NAME",
    noODSCode: "No ODS code",
    noRoleName: "No role name",
    noAddress: "Address not found",
  };

  return { SELECT_YOUR_ROLE_PAGE_TEXT, EPS_CARD_STRINGS };
});

// Mock `react-router-dom` to prevent errors during component rendering in test
jest.mock("react-router-dom", () => ({
  useLocation: jest.fn(),
  useNavigate: jest.fn(),
}));

// Mock the AccessProvider context
jest.mock("@/context/AccessProvider", () => {
  const React = require("react");

  let mockContextValue = {
    noAccess: false,
    singleAccess: false,
    selectedRole: {
      role_name: "Role Name",
      role_id: "role-id",
      org_code: "deadbeef",
      org_name: "org name",
    },
    // selectedRole: undefined,
    rolesWithAccess: [],
    rolesWithoutAccess: [],
    loading: false,
    error: null,
    setNoAccess: jest.fn(),
    setSingleAccess: jest.fn(),
    setSelectedRole: jest.fn(),
    setUserDetails: jest.fn(),
    userDetails: undefined,
    clear: jest.fn(),
  }

  const MockAccessContext = React.createContext(mockContextValue);
  const useAccess = () => React.useContext(MockAccessContext);

  const __setMockContextValue = (newValue: any) => {
    mockContextValue = { ...mockContextValue, ...newValue };
    // Reassign the context’s defaultValue so subsequent consumers get the new values
    MockAccessContext._currentValue = mockContextValue;
    MockAccessContext._currentValue2 = mockContextValue;
  };

  return {
    AccessContext: MockAccessContext,
    useAccess,
    __setMockContextValue,
  };
});
// Import the setter for the mock access context.
const { __setMockContextValue } = require("@/context/AccessProvider");

// Default mock values for the AuthContext to simulate authentication state
const defaultAuthContext = {
  error: null,
  user: null,
  isSignedIn: false,
  idToken: null,
  accessToken: null,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
};

export const renderWithAuth = (authOverrides = {}) => {
  const authValue = { ...defaultAuthContext, ...authOverrides };

  return render(
    <AuthContext.Provider value={authValue}>
      <SelectYourRolePage />
    </AuthContext.Provider>,
  );
};

import { SELECT_YOUR_ROLE_PAGE_TEXT } from "@/constants/ui-strings/CardStrings";
import { EpsSpinnerStrings } from "@/constants/ui-strings/EpsSpinnerStrings";

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



describe("SelectYourRolePage", () => {
  // Clear all mock calls before each test to avoid state leaks
  beforeEach(() => {
    jest.clearAllMocks();
    __setMockContextValue({
      noAccess: false,
    });
  });

  it("renders loading state when signed in but API call hasn't resolved yet", async () => {
    // Simulate a pending API call
    mockedAxios.get.mockImplementation(() => new Promise(() => { }));

    __setMockContextValue({ loading: true })

    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    });

    // Verify that the loading text appears
    const loadingText = screen.getByText(EpsSpinnerStrings.loading);
    expect(loadingText).toBeInTheDocument();
  });

  it("renders error summary if API call returns non-200 status", async () => {
    // Simulate a server error response
    __setMockContextValue({
      loading: false,
      error: "Failed to fetch CPT user info",
    })

    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    });

    await waitFor(() => {
      const errorHeading = screen.getByRole("heading", {
        name: SELECT_YOUR_ROLE_PAGE_TEXT.errorDuringRoleSelection,
      });
      expect(errorHeading).toBeInTheDocument();

      // Check for specific error text
      const errorItem = screen.getByText("Failed to fetch CPT user info");
      expect(errorItem).toBeInTheDocument();
    });
  });

  it("renders error summary if API call returns 200 but no userInfo is present", async () => {
    __setMockContextValue({
      loading: false,
      error: "Failed to fetch CPT user info",
    })

    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    });

    await waitFor(() => {
      const errorHeading = screen.getByRole("heading", {
        name: SELECT_YOUR_ROLE_PAGE_TEXT.errorDuringRoleSelection,
      });
      expect(errorHeading).toBeInTheDocument();

      const errorItem = screen.getByText("Failed to fetch CPT user info");
      expect(errorItem).toBeInTheDocument();
    });
  });

  it("renders the page content when valid userInfo is returned", async () => {
    __setMockContextValue({
      loading: false,
      error: null, // Important to clear any error state
      rolesWithAccess: [
        {
          role_name: "Pharmacist",
          org_name: "Test Pharmacy Org",
          org_code: "ORG123",
        },
      ],
      rolesWithoutAccess: [
        {
          role_name: "Technician",
          org_name: "Tech Org",
          org_code: "ORG456",
        },
      ],
    })

    // Mock 200 OK with valid userInfo
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: { userInfo: mockUserInfo },
    });

    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    });

    // Wait for the main content to load
    await waitFor(() => {
      // Check for the page heading
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent(SELECT_YOUR_ROLE_PAGE_TEXT.title);
    });
  });

  it("renders no access title and caption when no roles with access are available", async () => {
    // Mock user data with no roles with access
    __setMockContextValue({
      loading: false,
      error: null,
      noAccess: true,
      rolesWithAccess: [],
      rolesWithoutAccess: [
        {
          role_name: "Technician",
          org_name: "Tech Org",
          org_code: "ORG456",
        },
      ],
    }) // Added missing closing brace and semicolon here

    // Mock fetch to return 200 OK with valid userInfo
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: { userInfo: mockUserInfo },
    });

    // Render the page with user signed in
    __setMockContextValue({ noAccess: true });
    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    });

    // Wait for the main content to load
    await waitFor(() => {
      // Check for the no-access title
      const heading = screen.getByRole("heading", { level: 1 })
      expect(heading).toHaveTextContent(
        SELECT_YOUR_ROLE_PAGE_TEXT.titleNoAccess,
      )
    })
  })

  it("redirects to searchforaprescription when there is one role with access and no roles without access", async () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    __setMockContextValue({
      loading: false,
      error: null,
      singleAccess: true,
      rolesWithAccess: [
        {
          role_name: "Pharmacist",
          org_name: "Test Pharmacy Org",
          org_code: "ORG123",
        },
      ],
      rolesWithoutAccess: [],
    })

    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/searchforaprescription");
    })
  })

  it("renders loading state when waiting for API response", async () => {
    __setMockContextValue({
      loading: true,
    });

    mockedAxios.get.mockImplementation(() => new Promise(() => { }))
    renderWithAuth();

    expect(screen.getByText("Loading...")).toBeInTheDocument()
  });

  it("redirects when a single role is available", async () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);


    __setMockContextValue({
      loading: false,
      error: null,
      singleAccess: true,
      rolesWithAccess: [
        {
          role_name: "Pharmacist",
          org_name: "Test Pharmacy",
          org_code: "ORG123",
        },
      ],
      rolesWithoutAccess: [],
    })

    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: { userInfo: mockUserInfo },
    });

    __setMockContextValue({ noAccess: true })
    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    })

    await waitFor(() => {
      expect(useNavigate()).toHaveBeenCalledWith("/searchforaprescription");
    });
  });

  it("does not fetch user roles if user is not signed in", async () => {
    renderWithAuth({ isSignedIn: false });
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("displays an error when the API request fails", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Failed to fetch user roles"));

    __setMockContextValue({
      loading: false, // Make sure loading is false
      error: "Failed to fetch CPT user info",
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      noAccess: false,
      singleAccess: false,
      selectedRole: undefined,
    })

    // Render with auth
    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    })

    // Wait for the error summary to appear and loading to finish
    await waitFor(() => {
      const errorSummary = screen.getByRole("heading", {
        name: "Error during role selection",
      })
      expect(errorSummary).toBeInTheDocument()
      expect(
        screen.getByText("Failed to fetch CPT user info")
      ).toBeInTheDocument()
    })
  })
})
