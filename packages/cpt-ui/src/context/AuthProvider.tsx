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

import {readItemGroupFromLocalStorage, useLocalStorageState} from "@/helpers/useLocalStorageState"
import {API_ENDPOINTS} from "@/constants/environment"

import http from "@/helpers/axios"
import {RoleDetails, TrackerUserInfoResult, UserDetails} from "@cpt-ui-common/common-types"
import {getTrackerUserInfo, updateRemoteSelectedRole} from "@/helpers/userInfo"
import {logger} from "@/helpers/logger"

const CIS2SignOutEndpoint = API_ENDPOINTS.CIS2_SIGNOUT_ENDPOINT
export const LOGOUT_MARKER_STORAGE_KEY = "logoutMarker"
export const LOGOUT_MARKER_STORAGE_GROUP = "logoutMarker"

export type LogoutMarker = {
  timestamp: number
  reason: "signOut"
}

export interface AuthContextType {
  error: string | null
  user: string | null
  isSignedIn: boolean
  isSigningIn: boolean
  isSigningOut: boolean
  isConcurrentSession: boolean
  invalidSessionCause: string | undefined
  sessionId: string | undefined
  deviceId: string | undefined
  rolesWithAccess: Array<RoleDetails>
  rolesWithoutAccess: Array<RoleDetails>
  selectedRole: RoleDetails | undefined
  userDetails: UserDetails | undefined
  remainingSessionTime: number | undefined
  logoutMarker: LogoutMarker | undefined
  cognitoSignIn: (input?: SignInWithRedirectInput) => Promise<void>
  cognitoSignOut: (redirectUri?: string) => Promise<boolean>
  clearAuthState: () => void
  hasSingleRoleAccess: () => boolean
  updateSelectedRole: (value: RoleDetails) => Promise<void>
  updateTrackerUserInfo: () => Promise<TrackerUserInfoResult>
  updateInvalidSessionCause: (cause: string) => void
  setIsSigningOut: (value: boolean) => void
  setStateForSignOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({children}: { children: React.ReactNode }) => {
  Amplify.configure(authConfig, {ssr: false})
  const [deviceId] = useLocalStorageState<string | undefined>(
    "deviceId", "deviceId", crypto.randomUUID())
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
  const [remainingSessionTime, setRemainingSessionTime] = useLocalStorageState<number | undefined>(
    "remainingSessionTime",
    "remainingSessionTime",
    undefined
  )
  const [logoutMarker, setLogoutMarker] = useLocalStorageState<LogoutMarker | undefined>(
    LOGOUT_MARKER_STORAGE_KEY,
    LOGOUT_MARKER_STORAGE_GROUP,
    undefined
  )
  /**
   * Fetch and update the auth tokens
   */

  const clearAuthState = () => {
    setSelectedRole(undefined)
    setUserDetails(undefined)
    setRolesWithAccess([])
    setRolesWithoutAccess([])
    setUser(null)
    setIsSignedIn(false)
    setIsSigningIn(false)
    setIsConcurrentSession(false)
    setRemainingSessionTime(undefined)
    setSessionId(undefined)
    setInvalidSessionCause(undefined)
  }

  const updateTrackerUserInfo = async () => {
    const trackerUserInfo = await getTrackerUserInfo()
    if (!trackerUserInfo.error) {
      setRolesWithAccess(trackerUserInfo.rolesWithAccess)
      setRolesWithoutAccess(trackerUserInfo.rolesWithoutAccess)
      setSelectedRole(trackerUserInfo.selectedRole)
      setUserDetails(trackerUserInfo.userDetails)
    }
    setInvalidSessionCause(trackerUserInfo.invalidSessionCause) // Set first
    setIsConcurrentSession(trackerUserInfo.isConcurrentSession)
    setSessionId(trackerUserInfo.sessionId)
    setRemainingSessionTime(trackerUserInfo.remainingSessionTime)
    setError(trackerUserInfo.error)
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

  /** Sign out state helper */
  const setStateForSignOut = async () => {
    const marker: LogoutMarker = {timestamp: Date.now(), reason: "signOut"}
    if (typeof window !== "undefined") {
      try {
        const markerGroup = readItemGroupFromLocalStorage(LOGOUT_MARKER_STORAGE_GROUP)
        markerGroup[LOGOUT_MARKER_STORAGE_KEY] = marker
        window.localStorage.setItem(LOGOUT_MARKER_STORAGE_GROUP, JSON.stringify(markerGroup))
      } catch (error) {
        logger.error("Unable to synchronously write logout marker", error)
      }
    }
    setLogoutMarker(marker)
    setIsSignedIn(false)
    setIsSigningIn(false)
    setIsSigningOut(true)
  }

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
        throw new Error("Failed to sign out of CIS2:", {cause: err})
      }

      // signOut helper always sets a redirection URL
      logger.info("Calling Amplify Signout, with redirect URL", signoutRedirectUrl)
      await signOut({
        global: true,
        oauth: {redirectUrl: signoutRedirectUrl}
      })

      logger.info("Frontend amplify signout OK!")
      return true
    } catch (err) {
      // clearAuthState()
      setError(String(err))
      throw new Error("Failed to sign out", {cause: err})
    }
  }

  /**
   * Sign in process (redirect).
   */
  const cognitoSignIn = async (input?: SignInWithRedirectInput) => {
    logger.info("Initiating sign-in process...")
    setLogoutMarker(undefined)
    setIsSigningIn(true)
    setInvalidSessionCause(undefined)
    await signInWithRedirect(input)
  }

  const updateSelectedRole = async (newRole: RoleDetails) => {
    const selectedRole = await updateRemoteSelectedRole(newRole)
    setSelectedRole(selectedRole.currentlySelectedRole)
  }

  const updateInvalidSessionCause = (cause: string | undefined) => {
    setInvalidSessionCause(cause)
  }

  const hasSingleRoleAccess = () => {
    return rolesWithAccess.length === 1 && rolesWithoutAccess.length === 0
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
      selectedRole,
      userDetails,
      isConcurrentSession,
      invalidSessionCause,
      sessionId,
      remainingSessionTime,
      deviceId,
      logoutMarker,
      cognitoSignIn,
      cognitoSignOut,
      clearAuthState,
      hasSingleRoleAccess,
      updateSelectedRole,
      updateTrackerUserInfo,
      updateInvalidSessionCause,
      setIsSigningOut,
      setStateForSignOut
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
