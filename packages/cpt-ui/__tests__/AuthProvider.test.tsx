import React, { useContext } from 'react';
import { render, waitFor, screen } from '@testing-library/react';

import { Buffer } from 'buffer';
import { Amplify } from 'aws-amplify';
import { Hub } from "aws-amplify/utils";
import { signInWithRedirect, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

import { AuthContext, AuthProvider } from "@/context/AuthContext";


// Mock environment variables if needed
process.env.NEXT_PUBLIC_userPoolId = 'testUserPoolId';
process.env.NEXT_PUBLIC_userPoolClientId = 'testUserPoolClientId';
process.env.NEXT_PUBLIC_hostedLoginDomain = 'testDomain';
process.env.NEXT_PUBLIC_redirectSignIn = 'http://localhost:3000';
process.env.NEXT_PUBLIC_redirectSignOut = 'http://localhost:3000';

// Mock the AWS Amplify related functions and Hub
jest.mock('aws-amplify', () => ({
  Amplify: {
    configure: jest.fn()
  },
}));

jest.mock('aws-amplify/auth', () => ({
  signInWithRedirect: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
  fetchAuthSession: jest.fn()
}));

jest.mock('aws-amplify/utils', () => ({
  Hub: {
    listen: jest.fn(),
  },
}))

// A test component that consumes the AuthContext
const TestConsumer = () => {
  const auth = useContext(AuthContext);
  if (!auth) return null;

  return (
    <div>
      <div data-testid="isSignedIn">{auth.isSignedIn ? 'true' : 'false'}</div>
      <div data-testid="error">{auth.error || ''}</div>
      <div data-testid="state">{auth.state || ''}</div>
      <div data-testid="user">{auth.user ? 'UserPresent' : ''}</div>
      <div data-testid="idToken">{auth.idToken ? 'IdTokenPresent' : ''}</div>
      <div data-testid="accessToken">{auth.accessToken ? 'AccessTokenPresent' : ''}</div>
    </div>
  );
};

describe('AuthProvider', () => {
  let hubCallback: ((data: any) => void) | null = null;

  beforeAll(() => {
    global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
    global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
  });
  
  beforeEach(() => {
    jest.restoreAllMocks();
    (Hub.listen as jest.Mock).mockImplementation((channel, callback) => {
      if (channel === 'auth') {
        hubCallback = callback;
      }
      return () => {}; // unsubscribe mock
    });
  });

  it('should configure Amplify on mount', async () => {
    (fetchAuthSession as jest.Mock).mockResolvedValue({ tokens: {} });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(Amplify.configure).toHaveBeenCalled();
    });
  });

  it('should set isSignedIn to false if no valid tokens are returned', async () => {
    (fetchAuthSession as jest.Mock).mockResolvedValue({ tokens: {} });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isSignedIn').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('');
    });
  });

  it('should set isSignedIn to true and user when valid tokens are returned', async () => {
    const idTokenPayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; 
    const accessTokenPayload = { exp: Math.floor(Date.now() / 1000) + 3600 };

    (fetchAuthSession as jest.Mock).mockResolvedValue({
      tokens: {
        idToken: {
          toString: () => `header.${btoa(JSON.stringify(idTokenPayload))}.signature`,
          payload: idTokenPayload
        },
        accessToken: {
          toString: () => `header.${btoa(JSON.stringify(accessTokenPayload))}.signature`,
          payload: accessTokenPayload
        }
      }
    });
    (getCurrentUser as jest.Mock).mockResolvedValue({ username: 'testuser' });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isSignedIn').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('UserPresent');
      expect(screen.getByTestId('idToken').textContent).toBe('IdTokenPresent');
      expect(screen.getByTestId('accessToken').textContent).toBe('AccessTokenPresent');
    });
  });

  it('should handle Hub event signInWithRedirect and call getUser', async () => {
    // Initially no tokens
    (fetchAuthSession as jest.Mock).mockResolvedValueOnce({ tokens: {} });

    const { rerender } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isSignedIn').textContent).toBe('false');
    });

    // On signInWithRedirect event, simulate tokens
    const idTokenPayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; 
    const accessTokenPayload = { exp: Math.floor(Date.now() / 1000) + 3600 };

    (fetchAuthSession as jest.Mock).mockResolvedValue({
      tokens: {
        idToken: {
          toString: () => `header.${btoa(JSON.stringify(idTokenPayload))}.signature`,
          payload: idTokenPayload
        },
        accessToken: {
          toString: () => `header.${btoa(JSON.stringify(accessTokenPayload))}.signature`,
          payload: accessTokenPayload
        }
      }
    });
    (getCurrentUser as jest.Mock).mockResolvedValue({ username: 'testuser' });

    // Trigger Hub event
    if (hubCallback) {
      hubCallback({ payload: { event: 'signInWithRedirect' } });
    }

    rerender(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isSignedIn').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('UserPresent');
    });
  });

  it('should handle Hub event signInWithRedirect_failure', async () => {
    (fetchAuthSession as jest.Mock).mockResolvedValue({ tokens: {} });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Trigger Hub event
    if (hubCallback) {
      hubCallback({ payload: { event: 'signInWithRedirect_failure' } });
    }

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('An error has occurred during the OAuth flow.');
    });
  });

  it('should handle customOAuthState event', async () => {
    (fetchAuthSession as jest.Mock).mockResolvedValue({ tokens: {} });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Trigger Hub event for customOAuthState
    if (hubCallback) {
      hubCallback({ payload: { event: 'customOAuthState', data: 'my-custom-state' } });
    }

    await waitFor(() => {
      expect(screen.getByTestId('state').textContent).toBe('my-custom-state');
    });
  });

  it('should provide cognitoSignIn and cognitoSignOut functions', async () => {
    (fetchAuthSession as jest.Mock).mockResolvedValue({ tokens: {} });

    let contextValue: any;
    const TestConsumerWithFunctions = () => {
      contextValue = useContext(AuthContext);
      return null;
    };

    render(
      <AuthProvider>
        <TestConsumerWithFunctions />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue).toBeTruthy();
      expect(typeof contextValue.cognitoSignIn).toBe('function');
      expect(typeof contextValue.cognitoSignOut).toBe('function');
    });

    await contextValue.cognitoSignIn();
    expect(signInWithRedirect).toHaveBeenCalled();

    await contextValue.cognitoSignOut();
    expect(signOut).toHaveBeenCalled();
  });
});
