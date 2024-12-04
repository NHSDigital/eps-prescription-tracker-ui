import React, { createContext, useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { Hub } from "aws-amplify/utils";
import { signInWithRedirect, signOut, getCurrentUser, AuthUser, fetchAuthSession, JWT, SignInWithRedirectInput, SignOutInput } from 'aws-amplify/auth';
import { authConfig } from './configureAmplify';

Amplify.configure(authConfig, { ssr: true });

interface AuthContextType {
  error: string | null;
  user: AuthUser | null;
  state: string | null;
  isSignedIn: boolean;
  idToken: JWT | null;
  accessToken: JWT | null;
  signInWithRedirect: (input?: SignInWithRedirectInput) => Promise<void>;
  signOut: (input?: SignOutInput) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }) => {
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [state, setCustomState] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [idToken, setIdToken] = useState<JWT | null>(null);
  const [accessToken, setAccessToken] = useState<JWT | null>(null);

  useEffect(() => {
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      console.log("in auth listen")
      console.log(payload)
      switch (payload.event) {
        case "signInWithRedirect":
          getUser();
          break;
        case "signInWithRedirect_failure":
          setError("An error has occurred during the OAuth flow.");
          break;
        case "customOAuthState":
          setCustomState(payload.data); // this is the customState provided on signInWithRedirect function
          break;
      }
    });

    getUser();

    return unsubscribe;
  }, []);


  const getUser = async () => {
    try {
      const authSession = await fetchAuthSession({ forceRefresh: true });
      const accessToken = authSession.tokens?.accessToken;
      const idToken = authSession.tokens?.idToken;

      if (accessToken && idToken) {
        console.log("ID token is present:", idToken.payload);
        console.log("Access token is present:", accessToken.payload);

        // Check if the access token is expired
        if (accessToken.payload) {
          const decodedAccessToken = JSON.parse(atob(accessToken.toString().split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          if (decodedAccessToken.exp < currentTime) {
            console.log("Access token is expired. TODO: Refresh the token");
            setIsSignedIn(false);
            return;
          }
        }

        // Check if the id token is expired
        if (idToken.payload) {
          const decodedIdToken = JSON.parse(atob(idToken.toString().split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          if (decodedIdToken.exp < currentTime) {
            console.log("ID token is expired. TODO: Refresh the token");
            setIsSignedIn(false);
            return;
          }
        }
        
        setAccessToken(accessToken)
        setIdToken(idToken)
        setIsSignedIn(true)
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        }
        else {
          setIsSignedIn(false)
        }
    } catch (error) {
      console.error(error);
      console.log("Not signed in");
    }
  };


  return (
    <AuthContext.Provider value={{ error, user, state, isSignedIn, idToken, accessToken, signInWithRedirect, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
