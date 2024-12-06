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
}));

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

  const idTokenPayload = { exp: Math.floor(Date.now() / 1000) + 3600 };
  const accessTokenPayload = { exp: Math.floor(Date.now() / 1000) + 3600 };

  const createTokenMocks = () => ({
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

    render(
      <AuthProvider>
        {TestComponent}
      </AuthProvider>
    );
    await waitFor(() => {
      expect(Amplify.configure).toHaveBeenCalled();
    });
  };

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
    await renderWithProvider();
    // Just by rendering, we verify configuration was called
  });

  it('should set isSignedIn to false if no valid tokens are returned', async () => {
    await renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isSignedIn').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('');
    });
  });

  it('should set isSignedIn to true and user when valid tokens are returned', async () => {
    await renderWithProvider({
      sessionMock: createTokenMocks(),
      userMock: { username: 'testuser' }
    });

    await waitFor(() => {
      expect(screen.getByTestId('isSignedIn').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('UserPresent');
      expect(screen.getByTestId('idToken').textContent).toBe('IdTokenPresent');
      expect(screen.getByTestId('accessToken').textContent).toBe('AccessTokenPresent');
    });
  });

  it('should handle Hub event signInWithRedirect and call getUser', async () => {
    // Initially no tokens
    const { rerender } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    (fetchAuthSession as jest.Mock).mockResolvedValueOnce({ tokens: {} });

    await waitFor(() => {
      expect(screen.getByTestId('isSignedIn').textContent).toBe('false');
    });

    // On signInWithRedirect event, simulate tokens and user
    (fetchAuthSession as jest.Mock).mockResolvedValue(createTokenMocks());
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
    await renderWithProvider();
    if (hubCallback) {
      hubCallback({ payload: { event: 'signInWithRedirect_failure' } });
    }

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('An error has occurred during the OAuth flow.');
    });
  });

  it('should handle customOAuthState event', async () => {
    await renderWithProvider();
    if (hubCallback) {
      hubCallback({ payload: { event: 'customOAuthState', data: 'my-custom-state' } });
    }

    await waitFor(() => {
      expect(screen.getByTestId('state').textContent).toBe('my-custom-state');
    });
  });

  it('should provide cognitoSignIn and cognitoSignOut functions', async () => {
    let contextValue: any;
    const TestConsumerWithFunctions = () => {
      contextValue = useContext(AuthContext);
      return null;
    };

    await renderWithProvider({ TestComponent: <TestConsumerWithFunctions /> });

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
