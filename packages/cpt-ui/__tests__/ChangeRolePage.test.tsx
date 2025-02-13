import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { useNavigate } from "react-router-dom";
import React from "react";

import { AuthContext } from "@/context/AuthProvider";

import axios from "@/helpers/axios";
jest.mock("@/helpers/axios");

// Tell TypeScript that axios is a mocked version.
const mockedAxios = axios as jest.Mocked<typeof axios>;

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

  return { CHANGE_YOUR_ROLE_PAGE_TEXT, EPS_CARD_STRINGS };
});

// Mock `react-router-dom` to prevent errors during component rendering in test
jest.mock("react-router-dom", () => ({
  useLocation: jest.fn(),
  useNavigate: jest.fn(),
}));

// Create a global mock for `fetch` to simulate API requests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the AccessProvider context
jest.mock("@/context/AccessProvider", () => {
  const React = require("react");

  const createMockContext = (overrides = {}) => ({
    noAccess: false,
    singleAccess: false,
    selectedRole: undefined,
    rolesWithAccess: [],
    rolesWithoutAccess: [],
    loading: false,
    error: null,
    setNoAccess: jest.fn(),
    setSingleAccess: jest.fn(),
    setSelectedRole: jest.fn(),
    ...overrides,
  });

  // Create the initial mock context value
  const mockContextValue = createMockContext();

  const MockAccessContext = React.createContext(mockContextValue);
  const useAccess = () => React.useContext(MockAccessContext);

  // Add a method to update the mock value for testing
  const __setMockAccessValue = (overrides = {}) => {
    Object.assign(mockContextValue, createMockContext(overrides));
  };

  return {
    AccessContext: MockAccessContext,
    useAccess,
    __setMockAccessValue,
  };
});

const { __setMockAccessValue } = require("@/context/AccessProvider");

// Default mock values for the AuthContext to simulate authentication state
const defaultAuthContext = {
  error: null, // No errors by default
  user: null, // User is initially null (not logged in)
  isSignedIn: false, // Default state is "not signed in"
  idToken: null, // No ID token available
  accessToken: null, // No access token available
  cognitoSignIn: jest.fn(), // Mock Cognito sign-in function
  cognitoSignOut: jest.fn(), // Mock Cognito sign-out function
};

import ChangeRolePage from "@/pages/ChangeRolePage";

// Utility function to render the component with custom AuthContext overrides
const renderWithAuth = (authOverrides = {}, accessOverrides = {}) => {
  const authValue = { ...defaultAuthContext, ...authOverrides };
  return render(
    <AuthContext.Provider value={authValue}>
      <ChangeRolePage />
    </AuthContext.Provider>,
  );
};

import { CHANGE_YOUR_ROLE_PAGE_TEXT } from "@/constants/ui-strings/ChangeRolePageStrings";
import { EpsSpinnerStrings } from "@/constants/ui-strings/EpsSpinnerStrings";

describe("ChangeRolePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setMockAccessValue({});
  });

  it("renders loading state when signed in but API call hasn't resolved yet", async () => {
    __setMockAccessValue({ loading: true });

    // Render the page with user signed in
    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    });
  });

  it("renders error summary if API call returns non-200 status", async () => {
    __setMockAccessValue({
      error: "Failed to fetch CPT user info",
      loading: false,
    });

    // Render the page with user signed in
    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    });

    // Wait for the error message to appear
    await waitFor(() => {
      // Check for error summary heading
      const errorHeading = screen.getByRole("heading", {
        name: CHANGE_YOUR_ROLE_PAGE_TEXT.errorDuringRoleSelection,
      });
      expect(errorHeading).toBeInTheDocument();

      // Check for specific error text
      const errorItem = screen.getByText("Failed to fetch CPT user info");
      expect(errorItem).toBeInTheDocument();
    });
  });

  it("renders error summary if API call returns 200 but no userInfo is present", async () => {
    __setMockAccessValue({
      loading: false,
      error: "Failed to fetch CPT user info",
    });

    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    });

    await waitFor(() => {
      const errorHeading = screen.getByRole("heading", {
        name: CHANGE_YOUR_ROLE_PAGE_TEXT.errorDuringRoleSelection,
      });
      expect(errorHeading).toBeInTheDocument();

      const errorItem = screen.getByText("Failed to fetch CPT user info");
      expect(errorItem).toBeInTheDocument();
    });
  });

  it("renders the page content when valid userInfo is returned", async () => {
    __setMockAccessValue({
      loading: false,
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
          org_name: "Test Pharmacy Org",
          org_code: "ORG456",
        },
      ],
    });

    // Render the page with user signed in
    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    });

    // Wait for the main content to load
    await waitFor(() => {
      // Check for the page heading
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent(CHANGE_YOUR_ROLE_PAGE_TEXT.title);
    });

    // Verify the page caption
    expect(
      screen.getByText(CHANGE_YOUR_ROLE_PAGE_TEXT.caption),
    ).toBeInTheDocument();

    // Verify the "Roles without access" section
    expect(
      screen.getByText(
        CHANGE_YOUR_ROLE_PAGE_TEXT.roles_without_access_table_title,
      ),
    ).toBeInTheDocument();

    // Check for the table data using test IDs
    const nameCell = screen.getByTestId("change-role-name-cell");
    expect(nameCell).toHaveTextContent(`Test Pharmacy Org (ODS: ORG456)`);

    const roleCell = screen.getByTestId("change-role-role-cell");
    expect(roleCell).toHaveTextContent("Technician");
  });

  it("renders error summary when not signed in", async () => {
    __setMockAccessValue({
      loading: false,
      error: "Missing access or ID token",
    });

    renderWithAuth({ isSignedIn: false });

    const errorHeading = screen.getByRole("heading", {
      name: CHANGE_YOUR_ROLE_PAGE_TEXT.errorDuringRoleSelection,
    });
    expect(errorHeading).toBeInTheDocument();
    expect(screen.getByText("Missing access or ID token")).toBeInTheDocument();
  });

  it("redirects to searchforaprescription when there is one role with access and no roles without access", async () => {
    __setMockAccessValue({
      loading: false,
      rolesWithAccess: [
        {
          role_name: "Pharmacist",
          org_name: "Test Pharmacy Org",
          org_code: "ORG123",
        },
      ],
      rolesWithoutAccess: [],
      singleAccess: true,
    });

    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    // Render the page with user signed in
    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    });

    // Wait for redirection
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/searchforaprescription");
    });
  });

  it("renders loading state when waiting for API response", async () => {
    __setMockAccessValue({
      loading: true,
    });
    mockedAxios.get.mockImplementation(() => new Promise(() => {}));
    renderWithAuth();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("redirects when a single role is available", async () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    __setMockAccessValue({
      loading: false,
      rolesWithAccess: [
        {
          role_name: "Pharmacist",
          org_name: "Test Pharmacy",
          org_code: "ORG123",
        },
      ],
      rolesWithoutAccess: [],
      singleAccess: true,
    });

    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/searchforaprescription");
    });
  });

  it("does not fetch user roles if user is not signed in", async () => {
    renderWithAuth({ isSignedIn: false });
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("displays an error when the API request fails", async () => {
    __setMockAccessValue({
      loading: false,
      error: "Failed to fetch CPT user info",
      rolesWithAccess: [],
      rolesWithoutAccess: [],
    });

    renderWithAuth({
      isSignedIn: true,
      idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
    });

    await waitFor(() => {
      const errorHeading = screen.getByRole("heading", {
        name: CHANGE_YOUR_ROLE_PAGE_TEXT.errorDuringRoleSelection,
      });
      expect(errorHeading).toBeInTheDocument();

      const errorMessage = screen.getByText("Failed to fetch CPT user info");
      expect(errorMessage).toBeInTheDocument();
    });
  });
});
