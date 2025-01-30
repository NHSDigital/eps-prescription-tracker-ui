import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/context/AuthProvider";
import type { SignInWithRedirectInput, AuthUser, JWT } from "@aws-amplify/auth";
import LoginPage from "@/pages/LoginPage";

const mockCognitoSignIn = jest.fn();
const mockCognitoSignOut = jest.fn();

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

const defaultAuthState: AuthContextType = {
  isSignedIn: false,
  user: null,
  error: null,
  idToken: null,
  accessToken: null,
  cognitoSignIn: mockCognitoSignIn,
  cognitoSignOut: mockCognitoSignOut,
};

const MockAuthProvider = ({ children, initialState = defaultAuthState }) => {
  const [authState, setAuthState] = useState<AuthContextType>({
    isSignedIn: false,
    user: null,
    error: null,
    idToken: null,
    accessToken: null,
    cognitoSignIn: async (input?: SignInWithRedirectInput) => {
      mockCognitoSignIn(input);
      // Simulate a sign-in update
      setAuthState((prev) => ({
        ...prev,
        isSignedIn: true,
        user: {
          username:
            (input?.provider as { custom: string })?.custom || "mockUser",
          userId: "mock-user-id",
        } as AuthUser,
        error: null,
        idToken: { toString: () => "mockIdToken" } as JWT,
        accessToken: { toString: () => "mockAccessToken" } as JWT,
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
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
};

// Default environment mock
jest.mock("@/config/environment", () => ({
  ENV_CONFIG: {
    TARGET_ENVIRONMENT: "test",
  },
  MOCK_AUTH_ALLOWED_ENVIRONMENTS: ["test", "local"],
}));

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the page and the main buttons", () => {
    const { container } = render(
      <MockAuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </MockAuthProvider>,
    );

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
    render(
      <MockAuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </MockAuthProvider>,
    );

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
    render(
      <MockAuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </MockAuthProvider>,
    );

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
    render(
      <MockAuthProvider
        initialState={{
          ...defaultAuthState,
          isSignedIn: true,
          user: { username: "testUser" } as AuthUser,
          idToken: "mockIdToken" as unknown as JWT,
          accessToken: "mockAccessToken" as unknown as JWT,
        }}
      >
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </MockAuthProvider>,
    );

    const signOutBtn = screen.getByRole("button", { name: /Sign Out/i });
    await userEvent.click(signOutBtn);

    await waitFor(() => {
      expect(mockCognitoSignOut).toHaveBeenCalled();
    });
  });

  // TODO: Fix this test
  it.skip("shows a spinner when not in a mock auth environment", async () => {
    // Mock environment specifically for this test
    jest.resetModules();
    jest.mock("@/config/environment", () => ({
      ENV_CONFIG: {
        TARGET_ENVIRONMENT: "prod",
      },
      MOCK_AUTH_ALLOWED_ENVIRONMENTS: ["test", "local"],
    }));

    // Re-import LoginPage after mocking
    const { default: FreshLoginPage } = require("@/pages/LoginPage");

    const { container } = render(
      <MockAuthProvider>
        <BrowserRouter>
          <FreshLoginPage />
        </BrowserRouter>
      </MockAuthProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Redirecting to CIS2 login page/i),
      ).toBeInTheDocument();
    });

    const spinnerContainer = container.querySelector(".spinner-container");
    expect(spinnerContainer).toBeInTheDocument();
  });
});
