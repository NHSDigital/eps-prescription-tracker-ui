import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from "react"
import {Amplify} from "aws-amplify"
import {Hub} from "aws-amplify/utils"
import {signInWithRedirect, signOut, SignInWithRedirectInput} from "aws-amplify/auth"
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
  isConcurrentSession: boolean
  invalidSessionCause: string | undefined
  rolesWithAccess: Array<RoleDetails>
  rolesWithoutAccess: Array<RoleDetails>
  hasNoAccess: boolean
  hasSingleRoleAccess: boolean
  selectedRole: RoleDetails | undefined
  userDetails: UserDetails | undefined
  cognitoSignIn: (input?: SignInWithRedirectInput) => Promise<void>
  cognitoSignOut: (redirectUri?: string) => Promise<boolean>
  clearAuthState: () => void
  updateSelectedRole: (value: RoleDetails) => Promise<void>
  updateTrackerUserInfo: () => Promise<TrackerUserInfoResult>
  updateInvalidSessionCause: (cause: string) => void
}

export const AuthContext = createContext<AuthContextType | null>(null)
Amplify.configure(authConfig, {ssr: false})

export const AuthProvider = ({children}: { children: React.ReactNode }) => {
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useLocalStorageState<string | null>("user", "user", null)
  const [isSignedIn, setIsSignedIn] = useLocalStorageState<boolean>("isSignedIn", "isSignedIn", false)
  const [isSigningIn, setIsSigningIn] = useLocalStorageState<boolean>("isSigningIn", "isSigningIn", false)
  const [isConcurrentSession, setIsConcurrentSession] = useLocalStorageState<boolean>(
    "isConcurrentSession", "isConcurrentSession", false)
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
    return trackerUserInfo
  }

  /**
   * Set up Hub listener to react to auth events
   */
  useEffect(() => {
    const unsubscribe = Hub.listen("auth", async ({payload}) => {
      logger.info("Auth event payload:", payload)
      switch (payload.event) {
        // On successful signIn or token refresh, get the latest user state
        case "signedIn": {
          logger.info("Processing signedIn event")
          logger.info("User %s logged in", payload.data.username)
          await updateTrackerUserInfo()

          setIsSignedIn(true)
          setIsSigningIn(false)
          setUser(payload.data.username)
          logger.info("Finished the signedIn event ")
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
        case "signInWithRedirect_failure":
          logger.info("Processing tokenRefresh_failure or signInWithRedirect_failure event")
          clearAuthState()
          setError("An error has occurred during the OAuth flow.")
          break

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
          // Other auth events? The type-defined cases are already handled above.
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
    await signInWithRedirect(input)
    setIsSigningIn(true)
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
      rolesWithAccess,
      rolesWithoutAccess,
      hasNoAccess,
      hasSingleRoleAccess,
      selectedRole,
      userDetails,
      isConcurrentSession,
      invalidSessionCause,
      cognitoSignIn,
      cognitoSignOut,
      clearAuthState,
      updateSelectedRole,
      updateTrackerUserInfo,
      updateInvalidSessionCause
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
