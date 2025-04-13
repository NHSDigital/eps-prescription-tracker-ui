import React, {createContext, useEffect, useState} from "react"
import {Amplify} from "aws-amplify"
import {Hub} from "aws-amplify/utils"
import {
  signInWithRedirect,
  signOut,
  getCurrentUser,
  AuthUser,
  fetchAuthSession,
  JWT,
  SignInWithRedirectInput
} from "aws-amplify/auth"
import {authConfig} from "./configureAmplify"

import {useLocalStorageState} from "@/helpers/useLocalStorageState"
import {normalizePath} from "@/helpers/utils"
import {API_ENDPOINTS, FRONTEND_PATHS, NHS_REQUEST_URID} from "@/constants/environment"

import {useNavigate, useLocation} from "react-router-dom"

import http from "@/helpers/axios"

const CIS2SignOutEndpoint = API_ENDPOINTS.CIS2_SIGNOUT_ENDPOINT

export interface AuthContextType {
  error: string | null
  user: AuthUser | null
  isSignedIn: boolean
  idToken: JWT | null
  accessToken: JWT | null
  cognitoSignIn: (input?: SignInWithRedirectInput) => Promise<void>
  cognitoSignOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({children}: { children: React.ReactNode }) => {
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useLocalStorageState<AuthUser | null>("user", "auth", null)
  const [isSignedIn, setIsSignedIn] = useLocalStorageState<boolean>("isSignedIn", "auth", false)
  const [idToken, setIdToken] = useLocalStorageState<JWT | null>("idToken", "auth", null)
  const [accessToken, setAccessToken] = useLocalStorageState<JWT | null>("accessToken", "auth", null)

  const navigate = useNavigate()
  const location = useLocation()

  /**
   * Fetch and update the user session state.
   */
  const getUser = async () => {
    console.log("Fetching user session...")
    try {
      const authSession = await fetchAuthSession({forceRefresh: true})
      const sessionIdToken = authSession.tokens?.idToken
      const sessionAccessToken = authSession.tokens?.accessToken

      console.log("Tokens: ", sessionIdToken, sessionAccessToken)

      if (!sessionIdToken || !sessionAccessToken) {
        const noRedirectPaths = [
          FRONTEND_PATHS.LOGIN,
          FRONTEND_PATHS.LOGOUT
        ]

        if (!noRedirectPaths.includes(normalizePath(location.pathname))) {
          console.warn("No login detected. Redirecting to the login page")
          navigate(FRONTEND_PATHS.LOGIN)
        }
      }

      if (sessionIdToken && sessionAccessToken) {
        // Extract expiration times directly from the token payloads.
        const currentTime = Math.floor(Date.now() / 1000)

        // Check expiration of the access token
        if (sessionAccessToken.payload?.exp && sessionAccessToken.payload.exp < currentTime) {
          console.warn("Access token is expired. Consider refreshing the token.")
          setIsSignedIn(false)
          setUser(null)
          setIdToken(null)
          setAccessToken(null)
          setError("Cognito access token expired")
          return
        }

        // Check expiration of the ID token
        if (sessionIdToken.payload?.exp && sessionIdToken.payload.exp < currentTime) {
          console.warn("ID token is expired. Consider refreshing the token.")
          setIsSignedIn(false)
          setUser(null)
          setIdToken(null)
          setAccessToken(null)
          setError("Cognito ID token expired")
          return
        }

        // Tokens are valid and present, update state.
        setAccessToken(sessionAccessToken)
        setIdToken(sessionIdToken)
        setIsSignedIn(true)

        const currentUser = await getCurrentUser()
        setUser(currentUser)
        setError(null)
      } else {
        console.warn("Missing access or ID token.")
        setIsSignedIn(false)
        setUser(null)
        setIdToken(null)
        setAccessToken(null)
        setError("Missing access or ID token")
      }
    } catch (fetchError) {
      console.error("Error fetching user session:", fetchError)
      // Reset user/session state on failure.
      setUser(null)
      setAccessToken(null)
      setIdToken(null)
      setIsSignedIn(false)
      setError(String(fetchError))
    }
  }

  /**
   * Set up Hub listener to react to auth events and refresh session state.
   */
  useEffect(() => {
    const unsubscribe = Hub.listen("auth", ({payload}) => {
      console.log("Auth event payload:", payload)
      switch (payload.event) {
        // On successful signIn or token refresh, get the latest user state
        case "signedIn":
          console.log("User %s logged in", payload.data.username)
          setError(null)
          break
        case "tokenRefresh":
          console.log("Refreshing token")
          setError(null)
          break
        case "signInWithRedirect":
          setError(null)
          break

        case "tokenRefresh_failure":
        case "signInWithRedirect_failure":
          setError("An error has occurred during the OAuth flow.")
          setIsSignedIn(false)
          setUser(null)
          setIdToken(null)
          setAccessToken(null)
          break

        case "customOAuthState":
          console.log("Custom auth state!", payload)
          break

        case "signedOut":
          console.log("User signing out")
          setIsSignedIn(false)
          setUser(null)
          setIdToken(null)
          setAccessToken(null)
          setError(null)
          break

        default:
          // Other auth events? The type-defined cases are already handled above.
          break
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  /**
   * Reconfigure Amplify on changes to authConfig, then update the user state.
   */
  useEffect(() => {
    console.log("Configuring Amplify with authConfig:", authConfig)
    Amplify.configure(authConfig, {ssr: true})
    getUser()
  }, [authConfig])

  /**
   * Sign out process.
   */
  const cognitoSignOut = async () => {
    console.log("Signing out...")
    try {
      const signOutPromise = signOut({global: true})
        .then(() => {
          console.log("Frontend Cognito signout OK!")
        }).catch((err) => {
          console.log("Failed to sign out of cognito", err)
          throw err
        })
      const httpPromise = http
        .get(CIS2SignOutEndpoint, {
          headers: {
            Authorization: `Bearer ${idToken}`,
            "NHSD-Session-URID": NHS_REQUEST_URID
          }
        })
        .then(() => {
          console.log("Backend CIS2 signout OK")
        })
        .catch((err) => {
          console.warn("Backend CIS2 sign-out API call failed", err)
        })

      await Promise.all([signOutPromise, httpPromise])

      // Immediately reset state to signed out.
      setUser(null)
      setAccessToken(null)
      setIdToken(null)
      setIsSignedIn(false)
      setError(null)
    } catch (err) {
      console.error("Failed to sign out:", err)
      setError(String(err))
    }
  }

  /**
   * Sign in process (redirect).
   */
  const cognitoSignIn = async (input?: SignInWithRedirectInput) => {
    console.log("Initiating sign-in process...")
    return signInWithRedirect(input)
  }

  return (
    <AuthContext.Provider value={{
      error,
      user,
      isSignedIn,
      idToken,
      accessToken,
      cognitoSignIn,
      cognitoSignOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}
