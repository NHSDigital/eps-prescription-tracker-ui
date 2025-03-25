import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, useLocation } from "react-router-dom";

import { TrackerUserInfo } from "@/types/TrackerUserInfoTypes";

import { AccessProvider, useAccess } from "@/context/AccessProvider";
import { AuthContext } from "@/context/AuthProvider";

import axios from "@/helpers/axios";
jest.mock("@/helpers/axios");

// Tell TypeScript that axios is a mocked version.
const mockedAxios = axios as jest.Mocked<typeof axios>;

function TestConsumer() {
  const { noAccess, singleAccess, selectedRole, clear } = useAccess();

  return (
    <div>
      <div data-testid="noAccess">{noAccess ? "true" : "false"}</div>
      <div data-testid="singleAccess">{singleAccess ? "true" : "false"}</div>
      <div data-testid="selectedRole">
        {selectedRole ? selectedRole.role_id : "(none)"}
      </div>
      <button data-testid="clear-button" onClick={clear}>
        Clear
      </button>
    </div>
  );
}

// Helper component to display the current location
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

// Modified render function that accepts initial router entries.
const renderWithContext = (authOverrides = {}, initialEntries = ["/"]) => {
  const defaultAuthContext = {
    error: null,
    user: null,
    isSignedIn: false,
    idToken: null,
    accessToken: null,
    cognitoSignIn: jest.fn(),
    cognitoSignOut: jest.fn(),
  };
  const authValue = { ...defaultAuthContext, ...authOverrides };

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={authValue}>
        <AccessProvider>
          <TestConsumer />
          <LocationDisplay />
        </AccessProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe("AccessProvider", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    // Reset local storage between tests so each test starts fresh
    localStorage.clear();
  });

  it("does not fetch roles when user is not signed in", () => {
    renderWithContext({ isSignedIn: false, idToken: null });

    // Expect that axios.get is never called.
    expect(mockedAxios.get).not.toHaveBeenCalled();

    // Verify default context values.
    expect(screen.getByTestId("noAccess")).toHaveTextContent("false");
    expect(screen.getByTestId("singleAccess")).toHaveTextContent("false");
    expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)");
  });

  it("fetches roles when user is signed in and has an idToken", async () => {
    const mockUserInfo: TrackerUserInfo = {
      roles_with_access: [
        {
          role_id: "ROLE123",
          role_name: "Pharmacist",
          org_name: "Test Pharmacy Org",
          org_code: "ORG123",
          site_address: "1 Fake Street",
        },
      ],
      roles_without_access: [],
      currently_selected_role: {
        role_id: "ROLE123",
        role_name: "Pharmacist",
      },
      user_details: {
        family_name: "FAMILY",
        given_name: "GIVEN",
      },
    };

    // When axios.get is called, return a resolved promise with the expected response.
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { userInfo: mockUserInfo },
    });

    renderWithContext(
      {
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
      },
      ["/dashboard"]
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("noAccess")).toHaveTextContent("false");
      expect(screen.getByTestId("singleAccess")).toHaveTextContent("true");
      expect(screen.getByTestId("selectedRole")).toHaveTextContent("ROLE123");
    });
  });

  it("sets noAccess = true if roles_with_access is empty", async () => {
    const mockUserInfo: TrackerUserInfo = {
      roles_with_access: [],
      roles_without_access: [],
      user_details: {
        family_name: "FAMILY",
        given_name: "GIVEN",
      },
    };

    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { userInfo: mockUserInfo },
    });

    renderWithContext(
      {
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
      },
      ["/dashboard"]
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("noAccess")).toHaveTextContent("true");
      expect(screen.getByTestId("singleAccess")).toHaveTextContent("false");
      expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)");
    });
  });

  it("sets noAccess = false and singleAccess = false if multiple roles exist", async () => {
    const mockUserInfo: TrackerUserInfo = {
      roles_with_access: [
        { role_id: "ROLE1" } as any,
        { role_id: "ROLE2" } as any,
      ],
      roles_without_access: [],
      user_details: {
        family_name: "FAMILY",
        given_name: "GIVEN",
      },
    };

    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { userInfo: mockUserInfo },
    });

    renderWithContext(
      {
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
      },
      ["/dashboard"]
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("noAccess")).toHaveTextContent("false");
      expect(screen.getByTestId("singleAccess")).toHaveTextContent("false");
      expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)");
    });
  });

  it("does not update state if fetch returns a non-200 status", async () => {
    // Simulate an error response from the API.
    mockedAxios.get.mockResolvedValueOnce({
      status: 500,
      data: {},
    });

    renderWithContext(
      {
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
      },
      ["/dashboard"]
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("noAccess")).toHaveTextContent("false");
      expect(screen.getByTestId("singleAccess")).toHaveTextContent("false");
      expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)");
    });
  });

  it("calling clear resets the context values to their defaults", async () => {
    // Provide a single role so singleAccess = true
    const mockUserInfo: TrackerUserInfo = {
      roles_with_access: [
        {
          role_id: "ROLE_SINGLE",
          role_name: "SingleRole",
        },
      ],
      roles_without_access: [],
      currently_selected_role: {
        role_id: "ROLE_SINGLE",
        role_name: "SingleRole",
      },
      user_details: {
        family_name: "FAMILY",
        given_name: "GIVEN",
      },
    };

    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { userInfo: mockUserInfo },
    });

    renderWithContext(
      {
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
      },
      ["/dashboard"]
    );

    await waitFor(() => {
      expect(screen.getByTestId("noAccess")).toHaveTextContent("false");
      expect(screen.getByTestId("singleAccess")).toHaveTextContent("true");
      expect(screen.getByTestId("selectedRole")).toHaveTextContent("ROLE_SINGLE");
    });

    screen.getByTestId("clear-button").click();

    await waitFor(() => {
      expect(screen.getByTestId("noAccess")).toHaveTextContent("false");
      expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)");
      expect(screen.getByTestId("singleAccess")).toHaveTextContent("false");
    });
  });

  it("redirects to /select-role if selectedRole is undefined and location (with trailing slash) is not allowed", async () => {
    // Simulate a fetch response where no role is selected.
    const mockUserInfo: TrackerUserInfo = {
      roles_with_access: [
        { role_id: "ROLE1", role_name: "Role1" } as any,
      ],
      roles_without_access: [],
      // Pass an empty object so that ensureRoleSelected treats it as undefined.
      currently_selected_role: {},
      user_details: { family_name: "Doe", given_name: "John" },
    };

    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { userInfo: mockUserInfo },
    });

    // Provide an initial location with a trailing slash that is not allowed.
    renderWithContext(
      {
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
      },
      ["/dashboard/"]
    );

    // Wait for the API call.
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    // Because normalizePath("/dashboard/") becomes "/dashboard" (not allowed),
    // ensureRoleSelected should trigger a redirect to "/select-role".
    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent("/select-role");
    });
  });

  it("does not redirect if location is allowed (with trailing slash) even when selectedRole is undefined", async () => {
    const mockUserInfo: TrackerUserInfo = {
      roles_with_access: [],
      roles_without_access: [],
      // No currently_selected_role provided.
      user_details: { family_name: "Doe", given_name: "John" },
    };

    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { userInfo: mockUserInfo },
    });

    // Use an allowed path ("/login/") with a trailing slash.
    renderWithContext(
      {
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") },
      },
      ["/login/"]
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    // normalizePath("/login/") becomes "/login" which is in the allowed list,
    // so no redirect should occur.
    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent("/login/");
    });
  });
});
