import React, { useEffect, useState } from 'react';
import { Hub } from "aws-amplify/utils";
import { signInWithRedirect, signOut, getCurrentUser, fetchAuthSession, JWT } from "aws-amplify/auth";
import {Amplify} from "aws-amplify"
import axios from "axios"

import './App.css';
import { authConfig } from './configureAmplify';
Amplify.configure(authConfig, {ssr: true})

const trackerUserInfoEndpoint = "/api/tracker-user-info"

function App() {
  const [user, setUser] = useState(null);
  const [, setError] = useState(null);
  const [, setCustomState] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false)
  const [idToken, setIdToken] = useState<JWT>(null)
  const [accessToken, setAccessToken] = useState<JWT>(null)
  const [trackerUserInfoData, setTrackerUserInfoData] = useState<JWT>(null)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      console.log("in auth listen")
      console.log(payload)
      switch (payload.event) {
        case "signInWithRedirect":
          getUser();
          break;
        case "signInWithRedirect_failure":
          setError("An error has ocurred during the OAuth flow.");
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
      const accessToken = authSession.tokens?.accessToken
      const idToken = authSession.tokens?.idToken
      if (accessToken && idToken) {
        console.log(idToken.payload)
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

  const clearCookies = () => {
    const cookies = document.cookie.split("; ")
    for (let cookie of cookies) {
      const eqPos = cookie.indexOf("=")
      const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie
      // Setting the cookie expiration date to the past to effectively delete it
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
    }
  }

  const fetchTrackerUserInfo = async () => {
    setLoading(true)
    setTrackerUserInfoData(null)
    setError(null)

    // Clear cookies before making the request
    clearCookies()

    try {
      const response = await axios.get(trackerUserInfoEndpoint, 
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            'NHSD-Session-URID': '555254242106'
          },
          withCredentials: false
        }
      )
      setTrackerUserInfoData(response.data)
    } catch (err) {
      setError("Failed to fetch tracker user info")
      console.error("error fetching tracker user info:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <button onClick={() => signInWithRedirect({
        provider: {
          custom: "Primary"  // This is the name of the AWS::Cognito::UserPoolIdentityProvider we are using to sign in
        }
         })}>Log in with PTL CIS2</button>
      <button onClick={() => signInWithRedirect({
        provider: {
          custom: "Mock"  // This is the name of the AWS::Cognito::UserPoolIdentityProvider we are using to sign in
        }
         })}>Log in with mock CIS2</button>
      <button onClick={() => signOut()}>Sign Out</button>
      <div>username: {user?.username}</div>
      <div>isSignedIn: {isSignedIn} </div>
      <div>idToken: {idToken?.toString()}</div>
      <div>accessToken: {accessToken?.toString()}</div>
    
      <div style={{marginTop: '20px'}}>
         <button
          onClick={fetchTrackerUserInfo}
          disabled={!isSignedIn}
        >
            Fetch Tracker User Info
        </button>
      </div>
    
      {loading && <p>Loading...</p>}
      {trackerUserInfoData && (
        <div style={{marginTop: '20px'}}>
          <h3>Tracker User Info Data:</h3>
          <pre>{JSON.stringify(trackerUserInfoData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
