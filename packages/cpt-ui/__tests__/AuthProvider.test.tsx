import React, { useContext } from "react";
import { render, waitFor, screen, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import { Buffer } from "buffer";
import { Amplify } from "aws-amplify";
import { Hub } from "aws-amplify/utils";
import {
  signInWithRedirect,
  signOut,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";

import { AuthContext, AuthProvider } from "@/context/AuthProvider";

// Mock environment variables to mimic the real environment
process.env.VITE_userPoolId = "testUserPoolId";
process.env.VITE_userPoolClientId = "testUserPoolClientId";
process.env.VITE_hostedLoginDomain = "testDomain";
process.env.VITE_redirectSignIn = "http://localhost:3000";
process.env.VITE_redirectSignOut = "http://localhost:3000";

// Mock AWS Amplify functions to isolate AuthProvider logic
jest.mock("aws-amplify", () => ({
  Amplify: {
    configure: jest.fn(), // Mock Amplify configuration
  },
}));

jest.mock("aws-amplify/auth", () => ({
  signInWithRedirect: jest.fn(), // Mock redirect sign-in
  signOut: jest.fn(), // Mock sign-out
  getCurrentUser: jest.fn(), // Mock current user retrieval
  fetchAuthSession: jest.fn(), // Mock session fetch
}));

jest.mock("aws-amplify/utils", () => ({
  Hub: {
    listen: jest.fn(), // Mock Amplify Hub for event listening
  },
}));

// Mock useRouter and usePathName:
const usePathnameMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      prefetch: () => null,
    };
  },
  usePathname() {
    return "/";
  },
}));

// A helper component to consume the AuthContext and expose its values for testing
const TestConsumer = () => {
  const auth = useContext(AuthContext); // Access the AuthContext
  if (!auth) return null; // Return nothing if context is not available

  // Render state values for testing
  return (
    <div>
      <div data-testid="isSignedIn">{auth.isSignedIn ? "true" : "false"}</div>
      <div data-testid="error">{auth.error || ""}</div>
      <div data-testid="user">{auth.user ? "UserPresent" : ""}</div>
      <div data-testid="idToken">{auth.idToken ? "IdTokenPresent" : ""}</div>
      <div data-testid="accessToken">
        {auth.accessToken ? "AccessTokenPresent" : ""}
      </div>
    </div>
  );
};

// Test suite for AuthProvider
describe("AuthProvider", () => {
  // Variable to store the callback for Amplify Hub events
  let hubCallback: ((data: any) => void) | null = null;

  // Token payloads for mock sessions
  const idTokenPayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; // Valid token
  const accessTokenPayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; // Valid token

  // Helper function to create mock tokens
  const createTokenMocks = () => ({
    tokens: {
      idToken: {
        toString: () =>
          `header.${btoa(JSON.stringify(idTokenPayload))}.signature`,
        payload: idTokenPayload,
      },
      accessToken: {
        toString: () =>
          `header.${btoa(JSON.stringify(accessTokenPayload))}.signature`,
        payload: accessTokenPayload,
      },
    },
  });

  type RenderWithProviderOptions = {
    sessionMock?: { tokens: Record<string, unknown> };
    userMock?: any | null; // userMock can be `null` or `any`
    TestComponent?: JSX.Element;
  };

  const renderWithProvider = async ({
    sessionMock = { tokens: {} },
    userMock = null,
    TestComponent = <TestConsumer />,
  }: RenderWithProviderOptions = {}) => {
    (fetchAuthSession as jest.Mock).mockResolvedValue(sessionMock);
    (getCurrentUser as jest.Mock).mockResolvedValue(userMock);

    await act(async () => {
      render(
        <BrowserRouter>
          <AuthProvider>{TestComponent}</AuthProvider>
        </BrowserRouter>,
      );
    });

    await waitFor(() => {
      expect(Amplify.configure).toHaveBeenCalled();
    });
  };

  // Global setup for encoding functions
  beforeAll(() => {
    global.atob = (str) => Buffer.from(str, "base64").toString("binary");
    global.btoa = (str) => Buffer.from(str, "binary").toString("base64");
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.restoreAllMocks(); // Restore all mock implementations
    (Hub.listen as jest.Mock).mockImplementation((channel, callback) => {
      if (channel === "auth") {
        hubCallback = callback; // Store the Hub callback
      }
      return () => {}; // Mock unsubscribe function
    });
  });

  // Initialization and Configuration
  it("should configure Amplify on mount", async () => {
    // Verify Amplify.configure is called when the provider mounts
    await renderWithProvider();
    expect(Amplify.configure).toHaveBeenCalled();
  });

  // Session Handling
  it("should set isSignedIn to false if no valid tokens are returned", async () => {
    // Render without valid tokens
    await renderWithProvider();
    await waitFor(() => {
      // Check that the signed-in state is false and user is null
      expect(screen.getByTestId("isSignedIn").textContent).toBe("false");
      expect(screen.getByTestId("user").textContent).toBe("");
    });
  });

  it("should set isSignedIn to true and user when valid tokens are returned", async () => {
    // Render with valid tokens and a mock user
    await renderWithProvider({
      sessionMock: createTokenMocks(),
      userMock: { username: "testuser" },
    });

    await waitFor(() => {
      // Check that the signed-in state is true and user is present
      expect(screen.getByTestId("isSignedIn").textContent).toBe("true");
      expect(screen.getByTestId("user").textContent).toBe("UserPresent");
      expect(screen.getByTestId("idToken").textContent).toBe("IdTokenPresent");
      expect(screen.getByTestId("accessToken").textContent).toBe(
        "AccessTokenPresent",
      );
    });
  });

  it("should handle missing tokens during session fetch", async () => {
    // Simulate a session fetch with missing tokens
    const incompleteSession = { tokens: {} };

    await renderWithProvider({ sessionMock: incompleteSession });

    await waitFor(() => {
      // Assert that the user is not signed in due to missing tokens
      expect(screen.getByTestId("isSignedIn").textContent).toBe("false");
      expect(screen.getByTestId("user").textContent).toBe("");
    });
  });

  // Error Handling
  it("should handle fetchAuthSession failure", async () => {
    // Mock fetchAuthSession to throw an error
    (fetchAuthSession as jest.Mock).mockRejectedValue(
      new Error("Session fetch failed"),
    );

    await renderWithProvider();

    await waitFor(() => {
      // Assert that the user is not signed in due to session fetch failure
      expect(screen.getByTestId("isSignedIn").textContent).toBe("false");
      expect(screen.getByTestId("user").textContent).toBe("");
    });
  });

  it("should handle getCurrentUser failure gracefully", async () => {
    // Mock getCurrentUser to throw an error
    (getCurrentUser as jest.Mock).mockRejectedValue(
      new Error("User fetch failed"),
    );

    await renderWithProvider({
      sessionMock: createTokenMocks(),
    });

    await waitFor(() => {
      // Assert that valid tokens do not automatically result in user data due to user fetch failure
      expect(screen.getByTestId("isSignedIn").textContent).toBe("true");
      expect(screen.getByTestId("user").textContent).toBe("");
    });
  });

  it("should log an error and reset state when fetching user session fails", async () => {
    // Mock console.error to track calls
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Mock fetchAuthSession to throw an error
    const sessionError = new Error("Session fetch failed");
    (fetchAuthSession as jest.Mock).mockRejectedValueOnce(sessionError);

    // Render the provider
    await renderWithProvider();

    // Wait for the state to be reset
    await waitFor(() => {
      // Verify that the state is reset correctly
      expect(screen.getByTestId("isSignedIn").textContent).toBe("false");
      expect(screen.getByTestId("user").textContent).toBe("");
    });

    // Verify that the error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching user session:",
      sessionError,
    );

    // Restore the original console.error implementation
    consoleErrorSpy.mockRestore();
  });

  it("should log an error if signOut fails", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    const signOutError = new Error("Sign out failed");
    (signOut as jest.Mock).mockRejectedValue(signOutError);

    let contextValue: any;
    const TestComponent = () => {
      contextValue = useContext(AuthContext);
      return null;
    };

    await act(async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>,
      );
    });

    await act(async () => {
      await contextValue.cognitoSignOut();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to sign out:",
      signOutError,
    );
    consoleErrorSpy.mockRestore();
  });

  // Token Handling
  it("should log a warning and reset state when the ID token is expired", async () => {
    // Mock console.warn to track calls
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    // Create mock tokens with an expired ID token
    const expiredIdToken = {
      tokens: {
        idToken: {
          toString: () =>
            `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 }))}.signature`,
          payload: { exp: Math.floor(Date.now() / 1000) - 3600 },
        },
        accessToken: {
          toString: () =>
            `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`,
          payload: { exp: Math.floor(Date.now() / 1000) + 3600 },
        },
      },
    };

    // Render the provider with the expired ID token
    await renderWithProvider({ sessionMock: expiredIdToken });

    // Wait for the state to be reset and verify the warning
    await waitFor(() => {
      expect(screen.getByTestId("isSignedIn").textContent).toBe("false"); // State reset
      expect(screen.getByTestId("user").textContent).toBe("");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "ID token is expired. Consider refreshing the token.",
      ); // Warning logged
    });

    // Restore the original console.warn implementation
    consoleWarnSpy.mockRestore();
  });

  it("should handle expired tokens", async () => {
    // Create mock expired tokens
    const expiredTokens = {
      tokens: {
        idToken: {
          toString: () =>
            `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 }))}.signature`,
          payload: { exp: Math.floor(Date.now() / 1000) - 3600 },
        },
        accessToken: {
          toString: () =>
            `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 }))}.signature`,
          payload: { exp: Math.floor(Date.now() / 1000) - 3600 },
        },
      },
    };

    // Render with expired tokens
    await renderWithProvider({ sessionMock: expiredTokens });

    await waitFor(() => {
      // Verify signed-in state is false and user is cleared
      expect(screen.getByTestId("isSignedIn").textContent).toBe("false");
      expect(screen.getByTestId("user").textContent).toBe("");
    });
  });

  // Hub Events
  it("should handle Hub event signInWithRedirect", async () => {
    const mockSession = createTokenMocks();
    const mockUser = { username: "testuser" };

    (fetchAuthSession as jest.Mock).mockResolvedValue(mockSession);
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    await act(async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        </BrowserRouter>,
      );
    });

    // Ensure the Hub event listener (hubCallback) is initialized
    if (!hubCallback) {
      throw new Error("hubCallback is not initialized");
    }

    // Simulate the Hub event "signInWithRedirect"
    act(() => {
      // Simulate a successful Hub event for signInWithRedirect
      hubCallback!({ payload: { event: "signInWithRedirect" } });
    });

    await waitFor(() => {
      expect(screen.getByTestId("isSignedIn").textContent).toBe("true");
      expect(screen.getByTestId("user").textContent).toBe("UserPresent");
    });
  });

  it("should handle Hub event signInWithRedirect_failure", async () => {
    // Render the AuthProvider with a TestConsumer to observe context changes
    await renderWithProvider();

    // Ensure the Hub event listener (hubCallback) is initialized
    if (!hubCallback) {
      throw new Error("hubCallback is not initialized");
    }

    // Simulate the Hub event "signInWithRedirect_failure"
    act(() => {
      hubCallback!({ payload: { event: "signInWithRedirect_failure" } });
    });

    // Wait for the context state to update and verify changes
    await waitFor(() => {
      // Assert that an error is set after the Hub event failure
      expect(screen.getByTestId("error").textContent).toBe(
        "An error has occurred during the OAuth flow.", // Error state is updated
      );
    });
  });

  it("should handle tokenRefresh event successfully", async () => {
    await renderWithProvider({
      sessionMock: createTokenMocks(),
      userMock: { username: "testuser" },
    });

    await waitFor(() => {
      // Check that the signed-in state is true and user is present
      expect(screen.getByTestId("isSignedIn").textContent).toBe("true");
      expect(screen.getByTestId("user").textContent).toBe("UserPresent");
      expect(screen.getByTestId("idToken").textContent).toBe("IdTokenPresent");
      expect(screen.getByTestId("accessToken").textContent).toBe(
        "AccessTokenPresent",
      );
    });

    // Now simulate a token refresh event
    (fetchAuthSession as jest.Mock).mockResolvedValueOnce(createTokenMocks());
    (getCurrentUser as jest.Mock).mockResolvedValue({ username: "testuser" });

    // Trigger the tokenRefresh Hub event
    if (hubCallback) {
      hubCallback({ payload: { event: "tokenRefresh" } });
    }

    // After the tokenRefresh event, ensure no error and user remains signed in
    await waitFor(() => {
      expect(screen.getByTestId("error").textContent).toBe("");
      expect(screen.getByTestId("isSignedIn").textContent).toBe("true");
      expect(screen.getByTestId("user").textContent).toBe("UserPresent");
    });
  });

  it("should handle Hub event signedOut", async () => {
    // Render the AuthProvider and capture the Hub callback
    await renderWithProvider();

    // Ensure the Hub event listener (hubCallback) is initialized
    if (!hubCallback) {
      throw new Error("hubCallback is not initialized");
    }

    // Simulate the 'signedOut' Hub event
    act(() => {
      hubCallback!({ payload: { event: "signedOut" } });
    });

    // Verify that the context state is reset
    await waitFor(() => {
      expect(screen.getByTestId("isSignedIn").textContent).toBe("false");
      expect(screen.getByTestId("user").textContent).toBe("");
      expect(screen.getByTestId("idToken").textContent).toBe("");
      expect(screen.getByTestId("accessToken").textContent).toBe("");
      expect(screen.getByTestId("error").textContent).toBe("");
    });
  });

  // Auth Functions
  it("should provide cognitoSignIn and cognitoSignOut functions", async () => {
    let contextValue: any;
    const TestComponent = () => {
      contextValue = useContext(AuthContext);
      return null;
    };

    await act(async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>,
      );
    });

    await act(async () => {
      await contextValue.cognitoSignIn();
    });
    expect(signInWithRedirect).toHaveBeenCalled();

    await act(async () => {
      await contextValue.cognitoSignOut();
    });
    expect(signOut).toHaveBeenCalled();
  });
});
