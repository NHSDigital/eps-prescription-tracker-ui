// @ts-nocheck
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import React, { useState } from "react";

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

interface MockAuthProviderProps {
    children: React.ReactNode;
    defaultIsSignedIn?: boolean;
    defaultUser?: { username: string } | null;
  }
  
  const MockAuthProvider: React.FC<MockAuthProviderProps> = ({
    children,
    defaultIsSignedIn = true,
    defaultUser = { username: "mockUser" },
  }) => {
    // State to simulate auth changes
    const [authState, setAuthState] = useState({
      isSignedIn: defaultIsSignedIn,
      user: defaultUser,
      error: null as string | null,
      idToken: defaultIsSignedIn ? "mockIdToken" : null,
      accessToken: defaultIsSignedIn ? "mockAccessToken" : null,
      cognitoSignIn: async (options: { provider: { custom: any } }) => {
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
import { AuthContext } from "@/context/AuthProvider";
import LogoutPage from "@/app/logout/page";

describe("LogoutPage", () => {
  // Use fake timers to control the setTimeout in LogoutPage
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("renders 'Logout successful' immediately if the user is not signed in", () => {
    render(
      <MockAuthProvider defaultIsSignedIn={false}>
        <LogoutPage />
      </MockAuthProvider>
    );

    // The user is not signed in, so we expect to see "Logout successful".
    expect(screen.getByText(/Logout successful/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /You are now logged out of the service. To continue using the application, you must log in again/i
      )
    ).toBeInTheDocument();

    // We also expect to see the "Log in" link or button
    expect(screen.getByRole("link", { name: /log in/i })).toBeInTheDocument();

    // Because user is not signed in, we do NOT expect signOut to have been called
    expect(mockCognitoSignOut).not.toHaveBeenCalled();
  });

  it("shows a spinner and calls signOut when the user is signed in", async () => {
    render(
      <MockAuthProvider defaultIsSignedIn={true}>
        <LogoutPage />
      </MockAuthProvider>
    );

    // Because the user is signed in, we expect "Logging out" and spinner
    expect(screen.getByText(/Logging out/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    // signOut is delayed by 3s (for now). Fast forward the timers so the logout can complete.
    jest.advanceTimersByTime(3000);
    // Wait for re-render after signOut
    await waitFor(() => {
      expect(mockCognitoSignOut).toHaveBeenCalledTimes(1);
    });

    // After signOut, the user is no longer signed in, so we should see "Logout successful"
    expect(screen.getByText(/Logout successful/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /You are now logged out of the service. To continue using the application, you must log in again/i
      )
    ).toBeInTheDocument();
  });

  it("does not call signOut if user is signed in, but we haven't advanced timers yet", () => {
    render(
      <MockAuthProvider defaultIsSignedIn={true}>
        <LogoutPage />
      </MockAuthProvider>
    );

    // On initial render, user is signed in
    // The call is triggered, but only after the 3s setTimeout.
    // We haven't advanced timers, so the signOut shouldn't have completed yet.
    expect(screen.getByText(/Logging out/i)).toBeInTheDocument();
    expect(mockCognitoSignOut).not.toHaveBeenCalled();
    });
});
