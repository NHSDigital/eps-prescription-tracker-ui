import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";

import { TrackerUserInfo } from "@/types/TrackerUserInfoTypes";

import { AccessProvider, useAccess } from "@/context/AccessProvider";
import { AuthContext, type AuthContextType } from "@/context/AuthProvider";

import axios from "@/helpers/axios";
jest.mock("@/helpers/axios");

// Tell TypeScript that axios is a mocked version.
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockCognitoSignIn = jest.fn();
const mockCognitoSignOut = jest.fn();

const defaultAuthState: AuthContextType = {
  isSignedIn: false,
  user: null,
  error: null,
  idToken: null,
  accessToken: null,
  cognitoSignIn: mockCognitoSignIn,
  cognitoSignOut: mockCognitoSignOut,
};

const MockAuthProvider = ({
  children,
  initialState = defaultAuthState,
}: {
  children: React.ReactNode;
  initialState?: AuthContextType;
}) => {
  const [authState, setAuthState] = useState<AuthContextType>({
    ...initialState,
    cognitoSignIn: async (input) => {
      mockCognitoSignIn(input);
      // Simulate a sign-in update
      setAuthState((prev) => ({
        ...prev,
        isSignedIn: true,
        user: {
          username:
            (input?.provider as { custom: string })?.custom || "mockUser",
          userId: "mock-user-id",
        },
        error: null,
        idToken: { toString: () => "mockIdToken" } as any,
        accessToken: { toString: () => "mockAccessToken" } as any,
      }));
    },
    cognitoSignOut: async () => {
      mockCognitoSignOut();
      setAuthState((prev) => ({
        ...prev,
        isSignedIn: false,
        user: null,
        error: null,
        idToken: null,
        accessToken: null,
      }));
    },
  });

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

const renderWithProviders = (
  component: React.ReactElement,
  initialEntries: string[] = ["/"],
  initialAuthState: AuthContextType = defaultAuthState
) => {
  return render(
    <MockAuthProvider initialState={initialAuthState}>
      <MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>
    </MockAuthProvider>
  );
};

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

describe("AccessProvider", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    // Reset local storage between tests so each test starts fresh
    localStorage.clear();
  });

  it("does not fetch roles when user is not signed in", () => {
    renderWithProviders(
      <>
        <AccessProvider>
          <TestConsumer />
          <LocationDisplay />
        </AccessProvider>
      </>,
      ["/"],
      { ...defaultAuthState, isSignedIn: false, idToken: null }
    );

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

    renderWithProviders(
      <>
        <AccessProvider>
          <TestConsumer />
          <LocationDisplay />
        </AccessProvider>
      </>,
      ["/dashboard"],
      {
        ...defaultAuthState,
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } as any,
      }
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

    renderWithProviders(
      <>
        <AccessProvider>
          <TestConsumer />
          <LocationDisplay />
        </AccessProvider>
      </>,
      ["/dashboard"],
      {
        ...defaultAuthState,
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } as any,
      }
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
        { role_id: "ROLE1", role_name: "Role1" } as any,
        { role_id: "ROLE2", role_name: "Role2" } as any,
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

    renderWithProviders(
      <>
        <AccessProvider>
          <TestConsumer />
          <LocationDisplay />
        </AccessProvider>
      </>,
      ["/dashboard"],
      {
        ...defaultAuthState,
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } as any,
      }
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("noAccess")).toHaveTextContent("false");
      expect(screen.getByTestId("singleAccess")).toHaveTextContent("false");
      expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)");
    });
  });

  // New tests to add to the existing test file
  it("retrieves roles from localStorage when userInfo has no roles_with_access", async () => {
    // Prepare localStorage with stored roles
    localStorage.setItem('rolesWithAccess', JSON.stringify([
      {
        role_id: "ROLE456",
        role_name: "Nurse",
        org_name: "Test Hospital",
        org_code: "ORG456",
        site_address: "2 Mock Street",
      }
    ]));

    const mockUserInfo: TrackerUserInfo = {
      roles_without_access: [],
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

    renderWithProviders(
      <>
        <AccessProvider>
          <TestConsumer />
          <LocationDisplay />
        </AccessProvider>
      </>,
      ["/dashboard"],
      {
        ...defaultAuthState,
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } as any,
      }
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("noAccess")).toHaveTextContent("false");
      expect(screen.getByTestId("singleAccess")).toHaveTextContent("true");
      expect(screen.getByTestId("selectedRole")).toHaveTextContent("ROLE456");
    });
  });

  it("sets empty roles when userInfo is null", async () => {
    renderWithProviders(
      <>
        <AccessProvider>
          <TestConsumer />
          <LocationDisplay />
        </AccessProvider>
      </>,
      ["/dashboard"],
      {
        ...defaultAuthState,
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } as any,
      }
    );

    await waitFor(() => {
      expect(screen.getByTestId("noAccess")).toHaveTextContent("true");
      expect(screen.getByTestId("singleAccess")).toHaveTextContent("false");
      expect(screen.getByTestId("selectedRole")).toHaveTextContent("No Role");
    });
  });
  
  it("does not update state if fetch returns a non-200 status", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 500,
      data: {},
    });

    renderWithProviders(
      <>
        <AccessProvider>
          <TestConsumer />
          <LocationDisplay />
        </AccessProvider>
      </>,
      ["/dashboard"],
      {
        ...defaultAuthState,
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } as any,
      }
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

    renderWithProviders(
      <>
        <AccessProvider>
          <TestConsumer />
          <LocationDisplay />
        </AccessProvider>
      </>,
      ["/dashboard"],
      {
        ...defaultAuthState,
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } as any,
      }
    );

    await waitFor(() => {
      expect(screen.getByTestId("noAccess")).toHaveTextContent("false");
      expect(screen.getByTestId("singleAccess")).toHaveTextContent("true");
      expect(screen.getByTestId("selectedRole")).toHaveTextContent("ROLE_SINGLE");
    });

    userEvent.click(screen.getByTestId("clear-button"));

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

    renderWithProviders(
      <>
        <AccessProvider>
          <TestConsumer />
          <LocationDisplay />
        </AccessProvider>
      </>,
      ["/dashboard/"],
      {
        ...defaultAuthState,
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } as any,
      }
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
    renderWithProviders(
      <>
        <AccessProvider>
          <TestConsumer />
          <LocationDisplay />
        </AccessProvider>
      </>,
      ["/login/"],
      {
        ...defaultAuthState,
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } as any,
      }
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

// Add this new consumer component to your tests file:
function TestUpdateRoleConsumer() {
  const { selectedRole, updateSelectedRole } = useAccess();
  const handleUpdate = async () => {
    // Passing a new role object to update
    await updateSelectedRole({ role_id: "NEW_ROLE", role_name: "New Role" });
  };
  return (
    <div>
      <div data-testid="selectedRole">
        {selectedRole ? selectedRole.role_id : "(none)"}
      </div>
      <button data-testid="update-role-button" onClick={handleUpdate}>
        Update Role
      </button>
    </div>
  );
}

// Extend your existing test suite with the following tests:
describe("AccessProvider updateSelectedRole", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("updates selectedRole when updateSelectedRole is called successfully", async () => {
    // Mock axios.put to simulate a successful update (status 200)
    mockedAxios.put.mockResolvedValueOnce({
      status: 200,
    });

    renderWithProviders(
      <AccessProvider>
        <TestUpdateRoleConsumer />
      </AccessProvider>,
      ["/dashboard"],
      {
        ...defaultAuthState,
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } as any,
      }
    );

    // Initially, selectedRole should be empty.
    expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)");

    userEvent.click(screen.getByTestId("update-role-button"));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledTimes(1);
    });

    // After the update, selectedRole should be updated.
    await waitFor(() => {
      expect(screen.getByTestId("selectedRole")).toHaveTextContent("NEW_ROLE");
    });
  });

  it("alerts user when updateSelectedRole fails due to non-200 response", async () => {
    // Mock axios.put to simulate a failure (non-200 response)
    mockedAxios.put.mockResolvedValueOnce({
      status: 500,
    });

    // Spy on window.alert
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => { });

    renderWithProviders(
      <AccessProvider>
        <TestUpdateRoleConsumer />
      </AccessProvider>,
      ["/dashboard"],
      {
        ...defaultAuthState,
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } as any,
      }
    );

    userEvent.click(screen.getByTestId("update-role-button"));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "There was an issue selecting your role. Please notify the EPS team."
      );
    });

    // Ensure selectedRole remains unchanged
    expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)");
  });

  it("alerts user when updateSelectedRole throws an error", async () => {
    // Mock axios.put to simulate an error (e.g. network error)
    mockedAxios.put.mockRejectedValueOnce(new Error("Network error"));

    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => { });

    renderWithProviders(
      <AccessProvider>
        <TestUpdateRoleConsumer />
      </AccessProvider>,
      ["/dashboard"],
      {
        ...defaultAuthState,
        isSignedIn: true,
        idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } as any,
      }
    );

    userEvent.click(screen.getByTestId("update-role-button"));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "There was an issue selecting your role. Please notify the EPS team."
      );
    });

    // Verify that selectedRole still remains unset.
    expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)");
  });
});
