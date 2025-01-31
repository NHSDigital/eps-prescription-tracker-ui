import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React, { useState, act } from "react";
import { BrowserRouter } from "react-router-dom";
import type { AuthUser, JWT, SignInWithRedirectInput } from "@aws-amplify/auth";
import { AuthContext, type AuthContextType } from "@/context/AuthProvider";
import LogoutPage from "@/pages/LogoutPage";

import { AccessProvider } from "@/context/AccessProvider";

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

// Create stable token objects
const mockIdToken = {
  toString: () => "mockIdToken",
} as JWT;

const mockAccessToken = {
  toString: () => "mockAccessToken",
} as JWT;

interface MockAuthProviderProps {
  children: React.ReactNode;
  defaultIsSignedIn?: boolean;
  defaultUser?: AuthUser | null;
}

const mockCognitoSignIn = jest.fn();
const mockCognitoSignOut = jest.fn();
let isSigningOut = false; // Add this flag to track signout state

const MockAuthProvider: React.FC<MockAuthProviderProps> = ({
  children,
  defaultIsSignedIn = true,
  defaultUser = { username: "mockUser", userId: "mock-user-id" } as AuthUser,
}) => {
  // Change to use setState instead of just state
  const [authState, setAuthState] = useState<AuthContextType>(() => ({
    isSignedIn: defaultIsSignedIn,
    user: defaultUser,
    error: null,
    idToken: defaultIsSignedIn ? mockIdToken : null,
    accessToken: defaultIsSignedIn ? mockAccessToken : null,
    cognitoSignIn: async (input?: SignInWithRedirectInput) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      mockCognitoSignIn(input);
    },
    cognitoSignOut: async () => {
      if (isSigningOut) {
        return;
      }

      isSigningOut = true;
      try {
        await new Promise<void>((resolve) =>
          setTimeout(() => {
            mockCognitoSignOut();
            // Update auth state after signout
            setAuthState((prev) => ({
              ...prev,
              isSignedIn: false,
              user: null,
              idToken: null,
              accessToken: null,
            }));
            resolve();
          }, 3000),
        );
      } finally {
        isSigningOut = false;
      }
    },
  }));

  return (
    <BrowserRouter>
      <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
    </BrowserRouter>
  );
};

describe("LogoutPage", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    isSigningOut = false; // Reset the flag before each test
  });

  it("renders 'Logout successful' immediately if the user is not signed in", () => {
    render(
      <MockAuthProvider defaultIsSignedIn={false}>
        <AccessProvider>
          <LogoutPage />
        </AccessProvider>
      </MockAuthProvider>,
    );

    // The user is not signed in, so we expect to see "Logout successful".
    expect(screen.getByText(/Logout successful/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /You are now logged out of the service. To continue using the service, you must log in again/i,
      ),
    ).toBeInTheDocument();

    // We also expect to see the "Log in" link or button
    expect(screen.getByRole("link", { name: /log in/i })).toBeInTheDocument();

    // Because user is not signed in, we do NOT expect signOut to have been called
    expect(mockCognitoSignOut).not.toHaveBeenCalled();
  });

  it("shows a spinner and calls signOut when the user is signed in", async () => {
    render(
      <MockAuthProvider defaultIsSignedIn={true}>
        <AccessProvider>
          <LogoutPage />
        </AccessProvider>
      </MockAuthProvider>,
    );

    // Because the user is signed in, we expect "Logging out" and spinner
    expect(screen.getByText(/Logging out/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    // Advance timers and wait for state updates to complete
    await act(async () => {
      jest.runAllTimers();
    });

    // Since we've moved state updates into the timeout callback,
    // we should now only see one call
    expect(mockCognitoSignOut).toHaveBeenCalledTimes(1);

    expect(screen.getByText(/Logout successful/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /You are now logged out of the service. To continue using the service, you must log in again/i,
      ),
    ).toBeInTheDocument();
  });

  it("does not call signOut if user is signed in, but we haven't advanced timers yet", () => {
    render(
      <MockAuthProvider defaultIsSignedIn={true}>
        <AccessProvider>
          <LogoutPage />
        </AccessProvider>
      </MockAuthProvider>,
    );

    expect(screen.getByText(/Logging out/i)).toBeInTheDocument();
    expect(mockCognitoSignOut).not.toHaveBeenCalled();
  });
});
