import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";
import { JWT } from "aws-amplify/auth";

import RBACBanner from "@/components/RBACBanner";
import { useLocation, useNavigate } from "react-router-dom";

// Mock the module and directly reference the variable
jest.mock("@/constants/ui-strings/RBACBannerStrings", () => {
  const RBAC_BANNER_STRINGS = {
    CONFIDENTIAL_DATA:
      "CONFIDENTIAL: PERSONAL PATIENT DATA accessed by {lastName}, {firstName} - {roleName} - {orgName} (ODS: {odsCode})",
    NO_GIVEN_NAME: "NO_GIVEN_NAME",
    NO_FAMILY_NAME: "NO_FAMILY_NAME",
    NO_ROLE_NAME: "NO_ROLE_NAME",
    NO_ORG_NAME: "NO_ORG_NAME",
    NO_ODS_CODE: "NO_ODS_CODE",
    LOCUM_NAME: "Locum pharmacy",
  };

  return { RBAC_BANNER_STRINGS };
});

const {
  RBAC_BANNER_STRINGS,
} = require("@/constants/ui-strings/RBACBannerStrings");

// Create a global mock for `fetch` to simulate API requests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock AccessProvider
jest.mock("@/context/AccessProvider", () => {
  const React = require("react");

  let mockContextValue = {
    selectedRole: {
      role_name: "Role Name",
      role_id: "role-id",
      org_code: "deadbeef",
      org_name: "org name",
    },
    userDetails: {
      given_name: "JaNe",
      family_name: "DoE",
    },
    setUserDetails: jest.fn(),
    setSelectedRole: jest.fn(),
  };

  const MockAccessContext = React.createContext(mockContextValue);
  const useAccess = () => React.useContext(MockAccessContext);

  const __setMockContextValue = (newValue: any) => {
    mockContextValue = { ...mockContextValue, ...newValue };
    // Reassign the context’s defaultValue so subsequent consumers get new values
    MockAccessContext._currentValue = mockContextValue;
    MockAccessContext._currentValue2 = mockContextValue;
  };

  return {
    __esModule: true,
    AccessContext: MockAccessContext,
    useAccess,
    __setMockContextValue,
  };
});
const { __setMockContextValue } = require("@/context/AccessProvider");

// Mock an AuthContext
const AuthContext = React.createContext<any>(null);

// Default mock values for the `AuthContext` to simulate authentication state
const defaultAuthContext = {
  error: null,
  user: null,
  isSignedIn: true,
  idToken: {
    toString: jest.fn().mockReturnValue("mock-id-token"),
    payload: {},
  } as JWT,
  accessToken: null,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
};

export const renderWithAuth = (authOverrides = {}) => {
  const authValue = { ...defaultAuthContext, ...authOverrides };

  return render(
    <AuthContext.Provider value={authValue}>
      <RBACBanner />
    </AuthContext.Provider>
  );
};

describe("RBACBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setMockContextValue({
      selectedRole: {
        role_name: "Role Name",
        role_id: "role-id",
        org_code: "deadbeef",
        org_name: "org name",
      },
      userDetails: {
        family_name: "Doe",
        given_name: "Jane",
      },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    __setMockContextValue({
      selectedRole: {
        role_name: "Role Name",
        role_id: "role-id",
        org_code: "deadbeef",
        org_name: "org name",
      },
      userDetails: {
        family_name: "DoE",
        given_name: "Jane",
      },
    });

    renderWithAuth();

    // We expect no banner to appear
    expect(screen.queryByTestId("rbac-banner-div")).toBeNull();
    expect(screen.queryByTestId("rbac-banner-text")).toBeNull();
  });

  it("should render with the correct text when selectedRole and userDetails are set", () => {
    renderWithAuth();

    const bannerDiv = screen.getByTestId("rbac-banner-div");
    const bannerText = screen.getByTestId("rbac-banner-text");

    expect(bannerDiv).toBeInTheDocument();
    expect(bannerText).toBeInTheDocument();

    // Check that placeholders are properly replaced
    const expectedText = `CONFIDENTIAL: PERSONAL PATIENT DATA accessed by Doe, Jane - Role Name - org name (ODS: deadbeef)`;
    expect(bannerText).toHaveTextContent(expectedText);
  });

  it("should use LOCUM_NAME if org_code is FFFFF", () => {
    // Set the org_code to FFFFF to test locum-specific text
    __setMockContextValue({
      selectedRole: {
        role_name: "Role Name",
        role_id: "role-id",
        org_code: "FFFFF", // locum scenario
        org_name: "ignored org name", // This should be overridden
      },
    });

    // Check that placeholders are properly replaced
    const expectedText = `CONFIDENTIAL: PERSONAL PATIENT DATA accessed by DOE, Jane - Role Name - org name (ODS: deadbeef)`;
    expect(bannerText).toHaveTextContent(expectedText);
  });

  const bannerText = screen.getByTestId("rbac-banner-text");
  // Locum pharmacy name should appear
  expect(bannerText).toHaveTextContent(
    `CONFIDENTIAL: PERSONAL PATIENT DATA accessed by Doe, Jane - Role Name - Locum pharmacy (ODS: FFFFF)`
  );

  it("should handle missing userDetails fields", () => {
    __setMockContextValue({
      userDetails: {
        // No family_name or given_name
      },
    });

    const bannerText = screen.getByTestId("rbac-banner-text");
    // Locum pharmacy name should appear
    expect(bannerText).toHaveTextContent(
      `CONFIDENTIAL: PERSONAL PATIENT DATA accessed by DOE, Jane - Role Name - Locum pharmacy (ODS: FFFFF)`
    );
  });

  it("should handle missing selectedRole fields", () => {
    __setMockContextValue({
      selectedRole: {
        // role_name, ODS code, and org_name are missing
        role_id: "role-id",
      },
    });

    renderWithAuth();

    const bannerText = screen.getByTestId("rbac-banner-text");
    // Notice fallback values: NO_ROLE_NAME, NO_ORG_NAME, NO_ODS_CODE
    expect(bannerText).toHaveTextContent(
      `CONFIDENTIAL: PERSONAL PATIENT DATA accessed by Doe, Jane - NO_ROLE_NAME - NO_ORG_NAME (ODS: NO_ODS_CODE)`
    );
  });

  it("should fallback to NO_ORG_NAME if org_name is missing", () => {
    __setMockContextValue({
      selectedRole: {
        role_name: "Role Name",
        role_id: "role-id",
        org_code: "deadbeef",
        // org_name is missing
      },
    });

    renderWithAuth();

    const bannerText = screen.getByTestId("rbac-banner-text");
    expect(bannerText).toHaveTextContent(
      `CONFIDENTIAL: PERSONAL PATIENT DATA accessed by DOE, Jane - Role Name - NO_ORG_NAME (ODS: deadbeef)`
    );
  });

  // Example "dummy" test (remove or replace with real coverage as needed)
  it("Dummy test", () => {
    console.log("dummy test - no assertions");
  });
});
