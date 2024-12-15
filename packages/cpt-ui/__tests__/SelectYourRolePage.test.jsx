import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import SelectYourRolePage from "@/app/selectyourrole/page";
import { AuthContext } from "@/context/AuthContext";

// Mock `next/navigation` globally
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

// Define a global fetch mock
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("SelectYourRolePage", () => {
  const mockAuthContextValue = {
    isSignedIn: false,
    idToken: "",
  };

  // Helper: Renders component with optional custom AuthContext value
  const renderWithAuth = (authValue = mockAuthContextValue) => {
    return render(
      <AuthContext.Provider value={authValue}>
        <SelectYourRolePage />
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a heading by default (not signed in) but eventually shows an error", async () => {
    // Not signed in
    renderWithAuth({
      isSignedIn: false,
      idToken: "",
    });

    // Wait for error summary to appear
    await waitFor(() => {
      const errorHeading = screen.getByRole("heading", { name: /Error during role selection/i })
      expect(errorHeading).toBeInTheDocument();
      const errorText = screen.getByText("No login session found");
      expect(errorText).toBeInTheDocument();
    });
  });

  it("renders loading state when signed in but fetch hasn't resolved yet", async () => {
    // Mock fetch to never resolve
    mockFetch.mockImplementation(() => new Promise(() => {}));

    renderWithAuth({
      isSignedIn: true,
      idToken: "fake-token",
    });

    // Should show "Loading..." text
    const loadingText = screen.getByText(/loading.../i);
    expect(loadingText).toBeInTheDocument();
  });

  it("renders error summary if fetch returns non-200 status", async () => {
    // Mock fetch to return 500 status
    mockFetch.mockResolvedValue({
      status: 500,
    });

    renderWithAuth({
      isSignedIn: true,
      idToken: "fake-token",
    });

    // Expect error summary to appear
    await waitFor(() => {
      const errorHeading = screen.getByRole("heading", { name: /Error during role selection/i });
      expect(errorHeading).toBeInTheDocument();
      const errorItem = screen.getByText("Failed to fetch CPT user info");
      expect(errorItem).toBeInTheDocument();
    });
  });

  it("renders error summary if fetch returns 200 but the JSON body has no userInfo key", async () => {
    // Mock a 200 response without `userInfo`
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({}), // Missing userInfo
    });

    renderWithAuth({
      isSignedIn: true,
      idToken: "fake-token",
    });

    // Expect error summary to appear
    await waitFor(() => {
      const errorHeading = screen.getByRole("heading", { name: /Error during role selection/i });
      expect(errorHeading).toBeInTheDocument();
      const errorItem = screen.getByText("Failed to fetch CPT user info");
      expect(errorItem).toBeInTheDocument();
    });
  });

  it("renders the page content when valid userInfo is returned", async () => {
    const mockUserInfo = {
      roles_with_access: [
        {
          role_name: "Pharmacist",
          role_id: "pharm1",
          org_code: "ORG123",
          org_name: "Test Pharmacy Org",
          site_name: "Pharmacy Site",
          site_address: "1 Fake Street",
        },
      ],
      roles_without_access: [
        {
          role_name: "Technician",
          role_id: "tech1",
          org_code: "ORG456",
          org_name: "Tech Org",
          site_name: "Technician Site",
          site_address: "2 Fake Street",
        },
      ],
    };

    // Mock a successful 200 response
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => ({
        userInfo: mockUserInfo,
      }),
    });

    renderWithAuth({
      isSignedIn: true,
      idToken: "fake-token",
    });

    // Wait for normal state to appear (no errors)
    await waitFor(() => {
      // Title
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Select your role"); // from SELECT_ROLE_PAGE_TEXT
    });

    // Check the caption
    const caption = screen.getByText(/Select the role you wish to use to access the service/i);
    expect(caption).toBeInTheDocument();

    // Check that the "contentinfo" container is rendered
    const container = screen.getByRole("contentinfo");
    expect(container).toBeInTheDocument();

    // Check for confirm button text
    const confirmButton = screen.getByRole("button", { name: /Confirm and continue/i });
    expect(confirmButton).toBeInTheDocument();

    // Roles Without Access details expander
    const expander = screen.getByText("Roles without access");
    expect(expander).toBeInTheDocument();

    // Confirm the card is rendered
    const cardHeading = await screen.findByRole("heading", { name: /Tech Org \(ODS: ORG456\)/i });
    expect(cardHeading).toBeInTheDocument();

    // Confirm the card for "Technician" is rendered
    const cardRole = screen.getByText("Technician", {
      selector: ".eps-card__roleName", // Target the class for role names inside the card
    });
    expect(cardRole).toBeInTheDocument();
  
    // Confirm the table cell is rendered
    const tableCell = await screen.findByText(/Tech Org \(ODS: ORG456\)/i, { selector: "td" });
    expect(tableCell).toBeInTheDocument();

    // Confirm the table cell for "Technician" is rendered
    const tableRoleCell = screen.getByText("Technician", {
      selector: "td", // Target the table cell
    });

    expect(tableRoleCell).toBeInTheDocument();
    });
});
