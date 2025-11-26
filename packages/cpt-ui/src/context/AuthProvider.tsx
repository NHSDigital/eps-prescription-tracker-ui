import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from "react"
import {Amplify} from "aws-amplify"
import {Hub} from "aws-amplify/utils"
import {
  signInWithRedirect,
  signOut,
  SignInWithRedirectInput,
  getCurrentUser,
  fetchAuthSession
} from "aws-amplify/auth"
import {authConfig} from "./configureAmplify"

import {useLocalStorageState} from "@/helpers/useLocalStorageState"
import {API_ENDPOINTS} from "@/constants/environment"

import http from "@/helpers/axios"
import {RoleDetails, TrackerUserInfoResult, UserDetails} from "@cpt-ui-common/common-types"
import {getTrackerUserInfo, updateRemoteSelectedRole} from "@/helpers/userInfo"
import {logger} from "@/helpers/logger"

const CIS2SignOutEndpoint = API_ENDPOINTS.CIS2_SIGNOUT_ENDPOINT

export interface AuthContextType {
  error: string | null
  user: string | null
  isSignedIn: boolean
  isSigningIn: boolean
  isSigningOut: boolean
  isConcurrentSession: boolean
  invalidSessionCause: string | undefined
  sessionId: string | undefined
  rolesWithAccess: Array<RoleDetails>
  rolesWithoutAccess: Array<RoleDetails>
  hasNoAccess: boolean
  hasSingleRoleAccess: boolean
  selectedRole: RoleDetails | undefined
  userDetails: UserDetails | undefined
  cognitoSignIn: (input?: SignInWithRedirectInput) => Promise<void>
  cognitoSignOut: (redirectUri?: string) => Promise<boolean>
  clearAuthState: () => void
  clearStorageCompletely: () => number
  updateSelectedRole: (value: RoleDetails) => Promise<void>
  updateTrackerUserInfo: () => Promise<TrackerUserInfoResult>
  updateInvalidSessionCause: (cause: string) => void
  setIsSigningOut: (value: boolean) => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({children}: { children: React.ReactNode }) => {
  Amplify.configure(authConfig, {ssr: false})
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useLocalStorageState<string | null>("user", "user", null)
  const [isSignedIn, setIsSignedIn] = useLocalStorageState<boolean>("isSignedIn", "isSignedIn", false)
  const [isSigningIn, setIsSigningIn] = useLocalStorageState<boolean>("isSigningIn", "isSigningIn", false)
  const [isSigningOut, setIsSigningOut] = useLocalStorageState<boolean>("isSigningOut", "isSigningOut", false)
  const [isConcurrentSession, setIsConcurrentSession] = useLocalStorageState<boolean>(
    "isConcurrentSession", "isConcurrentSession", false)
  const [sessionId, setSessionId] = useLocalStorageState<string | undefined>(
    "sessionId", "sessionId", undefined)
  const [invalidSessionCause, setInvalidSessionCause] = useLocalStorageState<string | undefined>(
    "invalidSessionCause", "invalidSessionCause", undefined)
  const [rolesWithAccess, setRolesWithAccess] = useLocalStorageState<Array<RoleDetails>>(
    "rolesWithAccess", "rolesWithAccess", [])
  const [rolesWithoutAccess, setRolesWithoutAccess] = useLocalStorageState<Array<RoleDetails>>(
    "rolesWithoutAccess",
    "rolesWithoutAccess",
    [])
  const [hasNoAccess, setHasNoAccess] = useLocalStorageState<boolean>(
    "noAccess",
    "noAccess",
    true
  )
  const [selectedRole, setSelectedRole] = useLocalStorageState<RoleDetails | undefined>(
    "selectedRole",
    "selectedRole",
    undefined
  )
  const [userDetails, setUserDetails] = useLocalStorageState<UserDetails | undefined>(
    "userDetails",
    "userDetails",
    undefined
  )
  const [hasSingleRoleAccess, setHasSingleRoleAccess] = useLocalStorageState<boolean>(
    "singleAccess",
    "singleAccess",
    false
  )
  /**
   * Fetch and update the auth tokens
   */

  const clearAuthState = () => {
    setHasNoAccess(true)
    setHasSingleRoleAccess(false)
    setSelectedRole(undefined)
    setUserDetails(undefined)
    setRolesWithAccess([])
    setRolesWithoutAccess([])
    setUser(null)
    setIsSignedIn(false)
    setIsSigningIn(false)
    setIsConcurrentSession(false)
    // updateTrackerUserInfo will set InvalidSessionCause to undefined
  }

  const clearStorageCompletely = () => {
    logger.info("Performing complete storage cleanup")
    try {
      // Clear Cognito and Amplify localStorage
      const cognitoKeys = Object.keys(localStorage).filter(
        key => key.includes("CognitoIdentityServiceProvider") ||
               key.includes("amplify")
      )
      cognitoKeys.forEach(key => localStorage.removeItem(key))

      // Clear all sessionStorage
      sessionStorage.clear()

      logger.info(`Cleared ${cognitoKeys.length} Cognito keys from localStorage and all sessionStorage`)
      return cognitoKeys.length
    } catch (storageError) {
      logger.error("Error during complete storage cleanup", storageError)
      return 0
    }
  }

  const updateTrackerUserInfo = async () => {
    const trackerUserInfo = await getTrackerUserInfo()
    setRolesWithAccess(trackerUserInfo.rolesWithAccess)
    setRolesWithoutAccess(trackerUserInfo.rolesWithoutAccess)
    setHasNoAccess(trackerUserInfo.hasNoAccess)
    setSelectedRole(trackerUserInfo.selectedRole)
    setUserDetails(trackerUserInfo.userDetails)
    setHasSingleRoleAccess(trackerUserInfo.hasSingleRoleAccess)
    setError(trackerUserInfo.error)
    setIsConcurrentSession(trackerUserInfo.isConcurrentSession)
    setInvalidSessionCause(trackerUserInfo.invalidSessionCause)
    setSessionId(trackerUserInfo.sessionId)
    return trackerUserInfo
  }

  /**
   * Set up Hub listener to react to auth events
   */
  useEffect(() => {
    const unsubscribe = Hub.listen("auth", async ({payload}) => {
      logger.info("Auth event payload:", payload)
      switch (payload.event) {
        case "signedIn": {
          logger.info("Processing signedIn event")
          logger.info("User %s logged in", payload.data.username)

          try {
            await updateTrackerUserInfo()
            setIsSignedIn(true)
            setIsSigningIn(false)
            setUser(payload.data.username)
            logger.info("Finished the signedIn event")
          } catch (error: unknown) {
            logger.error("Error during signedIn processing", error)
            setError("Failed to complete sign-in process")
          }
          break
        }

        case "tokenRefresh":
          logger.info("Processing tokenRefresh event")
          setError(null)
          break

        case "signInWithRedirect":
          logger.info("Processing signInWithRedirect event")
          setError(null)
          break

        case "tokenRefresh_failure":
          logger.info("Processing tokenRefresh_failure event")
          clearAuthState()
          setError("Token refresh failed. Please sign in again.")
          break

        case "signInWithRedirect_failure": {
          logger.info("Processing signInWithRedirect_failure event", payload)

          // Check if this is the UserAlreadyAuthenticatedException
          const errorMessage = payload.data?.error?.message || ""
          const errorName = payload.data?.error?.name || ""
          const isUserAlreadyAuthError =
            errorMessage.includes("already a signed in user") ||
            errorName === "UserAlreadyAuthenticatedException"

          if (isUserAlreadyAuthError) {
            logger.error("UserAlreadyAuthenticatedException during OAuth callback")

            // Clear all auth state
            clearAuthState()

            // Clear Cognito localStorage
            try {
              const cognitoKeys = Object.keys(localStorage).filter(
                key => key.includes("CognitoIdentityServiceProvider") ||
                       key.includes("amplify")
              )
              logger.info(`Clearing ${cognitoKeys.length} Cognito keys from localStorage`)
              cognitoKeys.forEach(key => localStorage.removeItem(key))
            } catch (storageError) {
              logger.error("Error clearing localStorage", storageError)
            }

            // Show user-friendly error
            setError("Session conflict detected. Redirecting to login...")

            // Redirect to login page after a brief delay
            setTimeout(() => {
              window.location.href = window.location.origin + "/login"
            }, 2000)
          } else {
            clearAuthState()
            setError("An error has occurred during the OAuth flow.")
          }
          break
        }

        case "customOAuthState":
          logger.info("Processing customOAuthState event")
          logger.info("Custom auth state!", payload)
          break

        case "signedOut":
          logger.info("Processing signedOut event")
          clearAuthState()
          setError(null)
          break

        default:
          logger.info("Received unknown event", payload)
          break
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  /**
   * Sign out process.
   */
  const cognitoSignOut = async (signoutRedirectUrl?: string): Promise<boolean> => {
    logger.info("Signing out in authProvider...")
    try {
      // Call CIS2 signout first, this ensures a session remains on Amplify side.
      logger.info(`Calling CIS2 Signout ${CIS2SignOutEndpoint}`)
      try {
        await http.get(CIS2SignOutEndpoint)
        logger.info("Successfully signed out of CIS2")
      } catch (err) {
        logger.error("Failed to sign out of CIS2:", err)
      }

      if (signoutRedirectUrl) {
        logger.info("Calling Amplify Signout, with redirect URL", signoutRedirectUrl)
        await signOut({
          global: true,
          oauth: {redirectUrl: signoutRedirectUrl}
        })

      } else {
        logger.info("Calling Amplify Signout, no redirect URL")
        await signOut({global: true})
      }

      // Thorough cleanup for security (especially important on shared computers)
      clearStorageCompletely()

      setIsSigningOut(true)
      logger.info("Frontend amplify signout OK!")
      return true
    } catch (err) {
      logger.error("Failed to sign out:", err)
      setError(String(err))
      return false
    }
  }

  /**
   * Sign in process (redirect).
   */
  const cognitoSignIn = async (input?: SignInWithRedirectInput) => {
    logger.info("Initiating sign-in process...")

    try {
      // Check if there's already an active session
      try {
        const currentUser = await getCurrentUser()

        if (currentUser) {
          logger.info("Existing session detected before sign-in redirect")

          // Check if session is valid
          try {
            await fetchAuthSession({forceRefresh: true})
            logger.info("Existing session is valid - clearing before new sign-in")
          } catch {
            logger.info("Existing session is invalid - will clear")
          }

          // Clear the existing session before redirecting to new sign-in
          logger.info("Signing out existing session before new sign-in redirect")
          await signOut({global: false}) // Local signout only, don't redirect

          // Small delay to ensure cleanup completes
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      } catch {
        // No existing user - proceed with sign-in
        logger.info("No existing session, proceeding with sign-in redirect")
      }

      // Now initiate the redirect
      await signInWithRedirect(input)
      setIsSigningIn(true)

    } catch (error: unknown) {
      logger.error("Error during sign-in redirect initiation", error)

      if (error && typeof error === "object" && "name" in error && error.name === "UserAlreadyAuthenticatedException") {
        logger.error("UserAlreadyAuthenticatedException before redirect - clearing session")

        // Clear Cognito localStorage
        try {
          const cognitoKeys = Object.keys(localStorage).filter(
            key => key.includes("CognitoIdentityServiceProvider") ||
                   key.includes("amplify")
          )
          cognitoKeys.forEach(key => localStorage.removeItem(key))
        } catch (storageError) {
          logger.error("Error clearing localStorage", storageError)
        }

        // Retry the redirect
        logger.info("Retrying sign-in redirect after clearing session")
        await signInWithRedirect(input)
        setIsSigningIn(true)
      } else {
        throw error
      }
    }
  }

  const updateSelectedRole = async (newRole: RoleDetails) => {
    const selectedRole = await updateRemoteSelectedRole(newRole)
    setRolesWithAccess(selectedRole.rolesWithAccess)
    setSelectedRole(newRole)
  }

  const updateInvalidSessionCause = (cause: string | undefined) => {
    setInvalidSessionCause(cause)
  }

  return (
    <AuthContext.Provider value={{
      error,
      user,
      isSignedIn,
      isSigningIn,
      isSigningOut,
      rolesWithAccess,
      rolesWithoutAccess,
      hasNoAccess,
      hasSingleRoleAccess,
      selectedRole,
      userDetails,
      isConcurrentSession,
      invalidSessionCause,
      sessionId,
      cognitoSignIn,
      cognitoSignOut,
      clearAuthState,
      clearStorageCompletely,
      updateSelectedRole,
      updateTrackerUserInfo,
      updateInvalidSessionCause,
      setIsSigningOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
