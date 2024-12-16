// @ts-nocheck
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";

// Mock the configureAmplify module
jest.mock("../context/configureAmplify", () => ({
  __esModule: true,
  authConfig: {
    Auth: {
      Cognito: {
        userPoolClientId: "mockUserPoolClientId",
        userPoolId: "mockUserPoolId",
        loginWith: {
          oauth: {
            domain: "mockHostedLoginDomain",
            scopes: ["openid", "email", "phone", "profile", "aws.cognito.signin.user.admin"],
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

// Create a mock AuthContext provider that allows us to control the state
const mockCognitoSignIn = jest.fn();
const mockCognitoSignOut = jest.fn();

const MockAuthProvider = ({ children }) => {
  // State to simulate auth changes
  const [authState, setAuthState] = useState({
    isSignedIn: false,
    user: null,
    error: null,
    idToken: null,
    accessToken: null,
    cognitoSignIn: async (options: { provider: { custom: any; }; }) => {
      mockCognitoSignIn(options);
      // Simulate a sign-in update
      setAuthState((prev) => ({
        ...prev,
        isSignedIn: true,
        user: { username: options?.provider?.custom || "mockUser" },
        error: null,
        idToken: "mockIdToken",
        accessToken: "mockAccessToken",
      }));
    },
    cognitoSignOut: async () => {
      mockCognitoSignOut();
      // Simulate a sign-out update
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

// Since we've referenced AuthContext in the mock provider, we need to re-import it here
// after the mock is set up.
import { AuthContext } from "../context/AuthProvider";
import AuthPage from "../app/auth_demo/page";

describe("AuthPage", () => {
  it("renders the page and the main buttons", () => {
    const { container } = render(
      <MockAuthProvider>
        <AuthPage />
      </MockAuthProvider>
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
        <AuthPage />
      </MockAuthProvider>
    );

    const primaryLogin = screen.getByRole("button", { name: /Log in with PTL CIS2/i });

    await userEvent.click(primaryLogin);

    await waitFor(() => {
      expect(mockCognitoSignIn).toHaveBeenCalledWith({
        provider: { custom: "Primary" },
      });
    });

    // After sign-in, check if the user details are displayed
    expect(screen.getByText(/username: Primary/i)).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('"isSignedIn": true'))
    ).toBeInTheDocument();
    expect(screen.getByText(/idToken: mockIdToken/i)).toBeInTheDocument();
    expect(screen.getByText(/accessToken: mockAccessToken/i)).toBeInTheDocument();
  });

  it("calls cognitoSignIn with 'Mock' when the mock login button is clicked", async () => {
    render(
      <MockAuthProvider>
        <AuthPage />
      </MockAuthProvider>
    );

    const mockLogin = screen.getByRole("button", { name: /Log in with mock CIS2/i });

    await userEvent.click(mockLogin);

    await waitFor(() => {
      expect(mockCognitoSignIn).toHaveBeenCalledWith({
        provider: { custom: "Mock" },
      });
    });

    // After sign-in with Mock, check if the username displayed is "Mock"
    expect(screen.getByText(/username: Mock/i)).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('"isSignedIn": true'))
    ).toBeInTheDocument();
    expect(screen.getByText(/idToken: mockIdToken/i)).toBeInTheDocument();
    expect(screen.getByText(/accessToken: mockAccessToken/i)).toBeInTheDocument();
  });

  it("calls cognitoSignOut when the sign out button is clicked", async () => {
    render(
      <MockAuthProvider>
        <AuthPage />
      </MockAuthProvider>
    );

    // First sign in to have a user state
    const primaryLogin = screen.getByRole("button", { name: /Log in with PTL CIS2/i });
    await userEvent.click(primaryLogin);

    await waitFor(() => {
      expect(mockCognitoSignIn).toHaveBeenCalled();
      expect(
        screen.getByText((content) => content.includes('"isSignedIn": true'))
      ).toBeInTheDocument();
    });

    const signOutBtn = screen.getByRole("button", { name: /Sign Out/i });
    await userEvent.click(signOutBtn);

    await waitFor(() => {
      expect(mockCognitoSignOut).toHaveBeenCalled();
    });

    // After sign-out, the user should be null, tokens cleared, and isSignedIn false
    expect(
      screen.getByText((content) => content.includes('"isSignedIn": false'))
    ).toBeInTheDocument();
  });
});
