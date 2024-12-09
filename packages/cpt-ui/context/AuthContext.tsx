import React, { createContext, useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { Hub } from "aws-amplify/utils";
import { signInWithRedirect, signOut, getCurrentUser, AuthUser, fetchAuthSession, JWT, SignInWithRedirectInput } from 'aws-amplify/auth';
import { authConfig } from './configureAmplify';

interface AuthContextType {
  error: string | null;
  user: AuthUser | null;
  isSignedIn: boolean;
  idToken: JWT | null;
  accessToken: JWT | null;
  cognitoSignIn: (input?: SignInWithRedirectInput) => Promise<void>;
  cognitoSignOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [idToken, setIdToken] = useState<JWT | null>(null);
  const [accessToken, setAccessToken] = useState<JWT | null>(null);

  /**
   * Helper to fetch the current user session and update state accordingly.
   */
  const getUser = async () => {
    console.log("Fetching user session...");
    try {
      const authSession = await fetchAuthSession({ forceRefresh: true });
      const sessionIdToken = authSession.tokens?.idToken;
      const sessionAccessToken = authSession.tokens?.accessToken;

      if (sessionIdToken && sessionAccessToken) {
        // Extract expiration times directly from the token payloads.
        const currentTime = Math.floor(Date.now() / 1000);

        if (sessionAccessToken.payload?.exp && sessionAccessToken.payload.exp < currentTime) {
          console.warn("Access token is expired. Consider refreshing the token.");
          setIsSignedIn(false);
          return;
        }

        if (sessionIdToken.payload?.exp && sessionIdToken.payload.exp < currentTime) {
          console.warn("ID token is expired. Consider refreshing the token.");
          setIsSignedIn(false);
          return;
        }

        // Tokens are valid and present, update state.
        setAccessToken(sessionAccessToken);
        setIdToken(sessionIdToken);
        setIsSignedIn(true);

        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } else {
        console.warn("Missing access or ID token.");
        setIsSignedIn(false);
      }
    } catch (fetchError) {
      console.error("Error fetching user session:", fetchError);
      // Reset user/session state on failure.
      setUser(null);
      setAccessToken(null);
      setIdToken(null);
      setIsSignedIn(false);
    }
  };

  /**
   * Listen to authentication events from Hub.
   * On specific events, handle errors or reset error state.
   */
  useEffect(() => {
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      console.log("Auth event payload:", payload);
      switch (payload.event) {
        case "signInWithRedirect_failure":
          setError("An error has occurred during the OAuth flow.");
          break;
        default:
          // For any other auth events, reset the error.
          setError(null);
      }
    });

    // Attempt to fetch user session on initial load.
    getUser().then(() => {
      console.log("User session fetched after Hub listener initialization.");
    }).catch((err) => {
      console.error("Failed to get user session after Hub listener:", err);
    });

    return () => {
      // Unsubscribe from Hub events on component unmount.
      unsubscribe();
    };
  }, []);

  /**
   * Reconfigure Amplify when authConfig changes or on initial render.
   */
  useEffect(() => {
    console.log("Configuring Amplify with authConfig:", authConfig);
    Amplify.configure(authConfig, { ssr: true });
    console.log("Amplify configured. Checking existing session...");

    getUser().then(() => {
      console.log("User session fetched after Amplify configuration.");
    }).catch((err) => {
      console.error("Failed to get user session after Amplify configuration:", err);
    });
  }, [authConfig]);

  /**
   * Initiates Cognito sign out process and updates local state.
   */
  const cognitoSignOut = async () => {
    console.log("Signing out...");
    // Immediately reset local state to represent a signed-out user.
    setUser(null);
    setAccessToken(null);
    setIdToken(null);
    setIsSignedIn(false);

    try {
      await signOut({ global: true });
      console.log("Signed out successfully!");
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  /**
   * Initiates the Cognito sign in with redirect flow.
   */
  const cognitoSignIn = async (input?: SignInWithRedirectInput) => {
    console.log("Initiating sign-in process...");
    return signInWithRedirect(input);
  };

  return (
    <AuthContext.Provider value={{
      error,
      user,
      isSignedIn,
      idToken,
      accessToken,
      cognitoSignIn,
      cognitoSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
