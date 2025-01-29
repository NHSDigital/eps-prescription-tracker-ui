import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthContext } from "@/context/AuthProvider";
import LoginPage from "@/pages/LoginPage";

jest.mock("@/config/environment", () => ({
  ENV_CONFIG: {
    TARGET_ENVIRONMENT: "test",
  },
  MOCK_AUTH_ALLOWED_ENVIRONMENTS: ["test", "local"],
  API_ENDPOINTS: {
    TRACKER_USER_INFO: "mock-endpoint",
  },
}));

// Mock the configureAmplify module
jest.mock("@/context/configureAmplify", () => ({
  __esModule: true,
  authConfig: {
    Auth: {
      Cognito: {
        userPoolClientId: "mockUserPoolClientId",
        userPoolId: "mockUserPoolId",
        loginWith: {
          oauth: {
            domain: "mockHostedLoginDomain",
            scopes: [
              "openid",
              "email",
              "phone",
              "profile",
              "aws.cognito.signin.user.admin",
            ],
            redirectSignIn: ["mockRedirectSignIn"],
            redirectSignOut: ["mockRedirectSignOut"],
            responseType: "code",
          },
          username: true,
          email: false,
          phone: false,
        },
      },
    },
  },
}));

const defaultAuthContext = {
  isSignedIn: false,
  user: null,
  error: null,
  idToken: null,
  accessToken: null,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
};

const renderWithProviders = (
  Component: React.ComponentType = LoginPage,
  authOverrides = {},
  environmentOverrides = {},
) => {
  if (Object.keys(environmentOverrides).length > 0) {
    // Reset modules
    jest.resetModules();

    // Update environment mock
    jest.doMock("@/config/environment", () => ({
      ENV_CONFIG: {
        TARGET_ENVIRONMENT: "test",
        ...environmentOverrides?.ENV_CONFIG,
      },
      MOCK_AUTH_ALLOWED_ENVIRONMENTS: ["test", "local"],
      API_ENDPOINTS: {
        TRACKER_USER_INFO: "mock-endpoint",
      },
      ...environmentOverrides,
    }));

    // Re-require both the component and the AuthContext
    const { AuthContext } = require("@/context/AuthProvider");
    ComponentToRender = require("@/pages/LoginPage").default;
  }

  // Initialize auth context
  const authValue = {
    ...defaultAuthContext,
    ...authOverrides,
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Component />
      </BrowserRouter>
    </AuthContext.Provider>,
  );
};

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Reset environment mock to default
    jest.doMock("@/config/environment", () => ({
      ENV_CONFIG: {
        TARGET_ENVIRONMENT: "test",
      },
      MOCK_AUTH_ALLOWED_ENVIRONMENTS: ["test", "local"],
      API_ENDPOINTS: {
        TRACKER_USER_INFO: "mock-endpoint",
      },
    }));
  });

  it.skip("renders the page and the main buttons", () => {
    const { container } = renderWithProviders(LoginPage);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();

    const primaryLogin = container.querySelector("#primary-signin");
    const mockLogin = container.querySelector("#mock-signin");
    const signout = container.querySelector("#signout");

    expect(primaryLogin).toBeInTheDocument();
    expect(mockLogin).toBeInTheDocument();
    expect(signout).toBeInTheDocument();
  });

  it("calls cognitoSignIn with 'Primary' when the primary login button is clicked", async () => {
    const mockCognitoSignIn = jest.fn();
    renderWithProviders(LoginPage, {
      cognitoSignIn: mockCognitoSignIn,
    });

    const primaryLogin = screen.getByRole("button", {
      name: /Log in with PTL CIS2/i,
    });

    await userEvent.click(primaryLogin);

    await waitFor(() => {
      expect(mockCognitoSignIn).toHaveBeenCalledWith({
        provider: { custom: "Primary" },
      });
    });
  });

  it("calls cognitoSignIn with 'Mock' when the mock login button is clicked", async () => {
    const mockCognitoSignIn = jest.fn();
    renderWithProviders(LoginPage, {
      cognitoSignIn: mockCognitoSignIn,
    });

    const mockLogin = screen.getByRole("button", {
      name: /Log in with mock CIS2/i,
    });

    await userEvent.click(mockLogin);

    await waitFor(() => {
      expect(mockCognitoSignIn).toHaveBeenCalledWith({
        provider: { custom: "Mock" },
      });
    });
  });

  it("calls cognitoSignOut when the sign out button is clicked", async () => {
    const mockCognitoSignOut = jest.fn();
    renderWithProviders(LoginPage, {
      isSignedIn: true,
      user: { username: "testUser" },
      idToken: "mockIdToken",
      accessToken: "mockAccessToken",
      cognitoSignOut: mockCognitoSignOut,
    });

    const signOutBtn = screen.getByRole("button", { name: /Sign Out/i });
    await userEvent.click(signOutBtn);

    await waitFor(() => {
      expect(mockCognitoSignOut).toHaveBeenCalled();
    });
  });

  it("shows a spinner when not in a mock auth environment", () => {
    jest.resetModules();

    // Get fresh instances
    const { AuthContext } = require("@/context/AuthProvider");
    const FreshLoginPage = require("@/pages/LoginPage").default;

    render(
      <AuthContext.Provider
        value={{
          ...defaultAuthContext,
          isSignedIn: false,
          cognitoSignIn: jest.fn(),
          cognitoSignOut: jest.fn(),
        }}
      >
        <BrowserRouter>
          <FreshLoginPage />
        </BrowserRouter>
      </AuthContext.Provider>,
    );

    const redirectingMessage = screen.getByText(
      /Redirecting to CIS2 login page/i,
    );
    expect(redirectingMessage).toBeInTheDocument();

    const spinnerContainer = document.querySelector(".spinner-container");
    expect(spinnerContainer).toBeInTheDocument();
  });
});
