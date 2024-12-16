import React, { useContext } from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';

import { Buffer } from 'buffer';
import { Amplify } from 'aws-amplify';
import { Hub } from "aws-amplify/utils";
import { signInWithRedirect, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

import { AuthContext, AuthProvider } from "@/context/AuthProvider";

// Mock environment variables to mimic the real environment
process.env.NEXT_PUBLIC_userPoolId = 'testUserPoolId';
process.env.NEXT_PUBLIC_userPoolClientId = 'testUserPoolClientId';
process.env.NEXT_PUBLIC_hostedLoginDomain = 'testDomain';
process.env.NEXT_PUBLIC_redirectSignIn = 'http://localhost:3000';
process.env.NEXT_PUBLIC_redirectSignOut = 'http://localhost:3000';

// Mock AWS Amplify functions to isolate AuthProvider logic
jest.mock('aws-amplify', () => ({
  Amplify: {
    configure: jest.fn(), // Mock Amplify configuration
  },
}));

jest.mock('aws-amplify/auth', () => ({
  signInWithRedirect: jest.fn(), // Mock redirect sign-in
  signOut: jest.fn(), // Mock sign-out
  getCurrentUser: jest.fn(), // Mock current user retrieval
  fetchAuthSession: jest.fn(), // Mock session fetch
}));

jest.mock('aws-amplify/utils', () => ({
  Hub: {
    listen: jest.fn(), // Mock Amplify Hub for event listening
  },
}));

// A helper component to consume the AuthContext and expose its values for testing
const TestConsumer = () => {
  const auth = useContext(AuthContext); // Access the AuthContext
  if (!auth) return null; // Return nothing if context is not available

  // Render state values for testing
  return (
    <div>
      <div data-testid="isSignedIn">{auth.isSignedIn ? 'true' : 'false'}</div>
      <div data-testid="error">{auth.error || ''}</div>
      <div data-testid="user">{auth.user ? 'UserPresent' : ''}</div>
      <div data-testid="idToken">{auth.idToken ? 'IdTokenPresent' : ''}</div>
      <div data-testid="accessToken">{auth.accessToken ? 'AccessTokenPresent' : ''}</div>
    </div>
  );
};

// Test suite for AuthProvider
describe('AuthProvider', () => {
  // Variable to store the callback for Amplify Hub events
  let hubCallback: ((data: any) => void) | null = null;

  // Token payloads for mock sessions
  const idTokenPayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; // Valid token
  const accessTokenPayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; // Valid token

  // Helper function to create mock tokens
  const createTokenMocks = () => ({
    tokens: {
      idToken: {
        toString: () => `header.${btoa(JSON.stringify(idTokenPayload))}.signature`,
        payload: idTokenPayload,
      },
      accessToken: {
        toString: () => `header.${btoa(JSON.stringify(accessTokenPayload))}.signature`,
        payload: accessTokenPayload,
      },
    },
  });

  // Helper function to render the provider and optionally inject mock session and user
  const renderWithProvider = async ({
    sessionMock = { tokens: {} },
    userMock = null as { username: string } | null, // Allow userMock to be null or an object with username
    TestComponent = <TestConsumer />,
  } = {}) => {
    // Mock session and user fetch
    (fetchAuthSession as jest.Mock).mockResolvedValue(sessionMock);
    (getCurrentUser as jest.Mock).mockResolvedValue(userMock);

    // Render the AuthProvider with the specified TestComponent
    await act(async () => {
      render(
        <AuthProvider>
          {TestComponent}
        </AuthProvider>
      );
    });

    // Ensure Amplify.configure was called
    await waitFor(() => {
      expect(Amplify.configure).toHaveBeenCalled();
    });
  };

  // Global setup for encoding functions
  beforeAll(() => {
    global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
    global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.restoreAllMocks(); // Restore all mock implementations
    (Hub.listen as jest.Mock).mockImplementation((channel, callback) => {
      if (channel === 'auth') {
        hubCallback = callback; // Store the Hub callback
      }
      return () => {}; // Mock unsubscribe function
    });
  });

  it('should configure Amplify on mount', async () => {
    // Verify Amplify.configure is called when the provider mounts
    await renderWithProvider();
    expect(Amplify.configure).toHaveBeenCalled();
  });

  it('should set isSignedIn to false if no valid tokens are returned', async () => {
    // Render without valid tokens
    await renderWithProvider();
    await waitFor(() => {
      // Check that the signed-in state is false and user is null
      expect(screen.getByTestId('isSignedIn').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('');
    });
  });

  it('should set isSignedIn to true and user when valid tokens are returned', async () => {
    // Render with valid tokens and a mock user
    await renderWithProvider({
      sessionMock: createTokenMocks(),
      userMock: { username: 'testuser' },
    });

    await waitFor(() => {
      // Check that the signed-in state is true and user is present
      expect(screen.getByTestId('isSignedIn').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('UserPresent');
      expect(screen.getByTestId('idToken').textContent).toBe('IdTokenPresent');
      expect(screen.getByTestId('accessToken').textContent).toBe('AccessTokenPresent');
    });
  });

  it('should handle Hub event signInWithRedirect', async () => {
    // Mock session and user for a successful signInWithRedirect Hub event
    const mockSession = createTokenMocks(); // Create valid mock tokens
    const mockUser = { username: 'testuser' }; // Create a mock user object
  
    // Mock Amplify functions to return the mocked session and user
    (fetchAuthSession as jest.Mock).mockResolvedValue(mockSession);
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
  
    // Render the AuthProvider with a TestConsumer to observe context changes
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });
  
    // Ensure the Hub event listener (hubCallback) is initialized
    if (!hubCallback) {
      throw new Error('hubCallback is not initialized');
    }
  
    // Simulate the Hub event "signInWithRedirect"
    act(() => {
      hubCallback!({ payload: { event: 'signInWithRedirect' } });
    });
  
    // Wait for the context state to update and verify changes
    await waitFor(() => {
      expect(screen.getByTestId('isSignedIn').textContent).toBe('true'); // User is signed in
      expect(screen.getByTestId('user').textContent).toBe('UserPresent'); // User object is present
    });
  });
  
  it('should handle Hub event signInWithRedirect_failure', async () => {
    // Render the AuthProvider with a TestConsumer to observe context changes
    await renderWithProvider();
  
    // Ensure the Hub event listener (hubCallback) is initialized
    if (!hubCallback) {
      throw new Error('hubCallback is not initialized');
    }
  
    // Simulate the Hub event "signInWithRedirect_failure"
    act(() => {
      hubCallback!({ payload: { event: 'signInWithRedirect_failure' } });
    });
  
    // Wait for the context state to update and verify changes
    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe(
        'An error has occurred during the OAuth flow.' // Error state is updated
      );
    });
  });

  it('should handle expired tokens', async () => {
    // Create mock expired tokens
    const expiredTokens = {
      tokens: {
        idToken: {
          toString: () => `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 }))}.signature`,
          payload: { exp: Math.floor(Date.now() / 1000) - 3600 },
        },
        accessToken: {
          toString: () => `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 }))}.signature`,
          payload: { exp: Math.floor(Date.now() / 1000) - 3600 },
        },
      },
    };

    // Render with expired tokens
    await renderWithProvider({ sessionMock: expiredTokens });

    await waitFor(() => {
      // Verify signed-in state is false and user is cleared
      expect(screen.getByTestId('isSignedIn').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('');
    });
  });

  it('should provide cognitoSignIn and cognitoSignOut functions', async () => {
    let contextValue: any;

    // Create a test consumer to access the context
    const TestComponent = () => {
      contextValue = useContext(AuthContext);
      return null;
    };

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    // Verify that cognitoSignIn calls signInWithRedirect
    await act(async () => {
      await contextValue.cognitoSignIn();
    });
    expect(signInWithRedirect).toHaveBeenCalled();

    // Verify that cognitoSignOut calls signOut
    await act(async () => {
      await contextValue.cognitoSignOut();
    });
    expect(signOut).toHaveBeenCalled();
  });
});
