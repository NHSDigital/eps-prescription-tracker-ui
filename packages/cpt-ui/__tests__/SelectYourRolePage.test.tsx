import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import SelectYourRolePage from "@/app/selectyourrole/page";
import { AuthContext } from "@/context/AuthProvider";

//TODO: Mock the card strings, so we have known text for the tests

// Mock `next/navigation` to prevent errors during component rendering in test
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

// Create a global mock for `fetch` to simulate API requests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Default mock values for the `AuthContext` to simulate authentication state
const defaultAuthContext = {
  error: null, // No errors by default
  user: null, // User is initially null (not logged in)
  isSignedIn: false, // Default state is "not signed in"
  idToken: null, // No ID token available
  accessToken: null, // No access token available
  cognitoSignIn: jest.fn(), // Mock Cognito sign-in function
  cognitoSignOut: jest.fn(), // Mock Cognito sign-out function
};

// Utility function to render the component with custom AuthContext overrides
const renderWithAuth = (authOverrides = {}) => {
  const authValue = { ...defaultAuthContext, ...authOverrides };
  return render(
    <AuthContext.Provider value={authValue}>
      <SelectYourRolePage />
    </AuthContext.Provider>
  );
};

describe("SelectYourRolePage", () => {
  // Clear all mock calls before each test to avoid state leaks
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state when signed in but fetch hasn't resolved yet", async () => {
    // Mock fetch to hang indefinitely, simulating a pending request
    mockFetch.mockImplementation(() => new Promise(() => {}));

    // Render the page with user signed in
    renderWithAuth({ isSignedIn: true, idToken: "mock-id-token" });

    // Verify that the "Loading..." text appears
    const loadingText = screen.getByText(/loading.../i);
    expect(loadingText).toBeInTheDocument();
  });

  it("renders error summary if fetch returns non-200 status", async () => {
    // Mock fetch to return a 500 status code (server error)
    mockFetch.mockResolvedValue({ status: 500 });

    // Render the page with user signed in
    renderWithAuth({ isSignedIn: true, idToken: "mock-id-token" });

    // Wait for the error message to appear
    await waitFor(() => {
      // Check for error summary heading
      const errorHeading = screen.getByRole("heading", { name: /Error during role selection/i });
      expect(errorHeading).toBeInTheDocument();

      // Check for specific error text
      const errorItem = screen.getByText("Failed to fetch CPT user info");
      expect(errorItem).toBeInTheDocument();
    });
  });

  it("renders error summary if fetch returns 200 but no userInfo is present", async () => {
    // Mock fetch to return 200 OK but with an empty JSON body
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({}), // No `userInfo` key in response
    });

    // Render the page with user signed in
    renderWithAuth({ isSignedIn: true, idToken: "mock-id-token" });

    // Wait for the error message to appear
    await waitFor(() => {
      // Check for error summary heading
      const errorHeading = screen.getByRole("heading", { name: /Error during role selection/i });
      expect(errorHeading).toBeInTheDocument();

      // Check for specific error text
      const errorItem = screen.getByText("Failed to fetch CPT user info");
      expect(errorItem).toBeInTheDocument();
    });
  });

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
    };

    // Mock fetch to return 200 OK with valid userInfo
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({ userInfo: mockUserInfo }),
    });

    // Render the page with user signed in
    renderWithAuth({ isSignedIn: true, idToken: "mock-id-token" });

    // Wait for the main content to load
    await waitFor(() => {
      // Check for the page heading
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Select your role");
    });

    // Verify the page caption
    const caption = screen.getByText(/Select the role you wish to use to access the service/i);
    expect(caption).toBeInTheDocument();

    // Verify the "Roles without access" section
    const expander = screen.getByText(/View your roles without access to the clinical prescription tracking service./i);
    expect(expander).toBeInTheDocument();

    // Check for the table data in "Roles without access"
    const tableOrg = screen.getByText(/Tech Org \(ODS: ORG456\)/i);
    expect(tableOrg).toBeInTheDocument();
    const tableRole = screen.getByText("Technician");
    expect(tableRole).toBeInTheDocument();
  });

  it("renders error summary when not signed in", async () => {
    // Render the page with `isSignedIn` set to false
    renderWithAuth({ isSignedIn: false, error: "Missing access or ID token" });

    // Wait for the error message to appear
    await waitFor(() => {
      // Check for error summary heading
      const errorHeading = screen.getByRole("heading", { name: /Error during role selection/i });
      expect(errorHeading).toBeInTheDocument();

      const errorItem = screen.getByText("Missing access or ID token");
      expect(errorItem).toBeInTheDocument();
    });
  });
});
