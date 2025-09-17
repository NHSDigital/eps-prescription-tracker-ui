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
  deleteUser
} from "aws-amplify/auth"
import {authConfig} from "./configureAmplify"

import {useLocalStorageState} from "@/helpers/useLocalStorageState"
import {API_ENDPOINTS} from "@/constants/environment"

import http from "@/helpers/axios"
import {RoleDetails, UserDetails} from "@cpt-ui-common/common-types"
import {getTrackerUserInfo, updateRemoteSelectedRole} from "@/helpers/userInfo"
import {logger} from "@/helpers/logger"

const CIS2SignOutEndpoint = API_ENDPOINTS.CIS2_SIGNOUT_ENDPOINT

export interface AuthContextType {
  error: string | null
  user: string | null
  isSignedIn: boolean
  isSigningIn: boolean
  isConcurrentSession: boolean
  rolesWithAccess: Array<RoleDetails>
  rolesWithoutAccess: Array<RoleDetails>
  hasNoAccess: boolean
  hasSingleRoleAccess: boolean
  selectedRole: RoleDetails | undefined
  userDetails: UserDetails | undefined
  cognitoSignIn: (input?: SignInWithRedirectInput) => Promise<void>
  cognitoSignOut: () => Promise<void>
  clearAuthState: () => void
  updateSelectedRole: (value: RoleDetails) => Promise<void>
  forceCognitoLogout: () => Promise<void>
  updateTrackerUserInfo: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({children}: { children: React.ReactNode }) => {
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useLocalStorageState<string | null>("user", "user", null)
  const [isSignedIn, setIsSignedIn] = useLocalStorageState<boolean>("isSignedIn", "isSignedIn", false)
  const [isSigningIn, setIsSigningIn] = useLocalStorageState<boolean>("isSigningIn", "isSigningIn", false)
  const [isConcurrentSession, setIsConcurrentSession] = useLocalStorageState<boolean>(
    "isConcurrentSession", "isConcurrentSession", false)
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
  }

  const forceCognitoLogout = async () => {
    try {
      logger.info("forcing cognito logout")
      await deleteUser()
    } catch (err) {
      logger.error("Error in cognito signout", {err})
    }
    logger.info("completed signout")
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
   * Reconfigure Amplify on initial state
   */
  useEffect(() => {
    Amplify.configure(authConfig, {ssr: false})
  }, [])

  /**
   * Sign out process.
   */
  const cognitoSignOut = async () => {
    logger.info("Signing out in authProvider...")
    try {
      // we need to sign out of cis2 first before signing out of cognito
      // as otherwise we may possibly not be authed to reach cis2 sign out endpoint
      logger.info(`calling ${CIS2SignOutEndpoint}`)
      await http.get(CIS2SignOutEndpoint)
      logger.info("Backend CIS2 signout OK!")
      logger.info(`calling amplify logout`)
      // this triggers a signedOutEvent which is handled by the hub listener
      // we clear all state in there
      await signOut({global: true})
      logger.info("Frontend amplify signout OK!")

    } catch (err) {
      logger.error("Failed to sign out:", err)
      setError(String(err))
    }
  }

  /**
   * Sign in process (redirect).
   */
  const cognitoSignIn = async (input?: SignInWithRedirectInput) => {
    logger.info("Initiating sign-in process...")
    setIsSigningIn(true)
    return signInWithRedirect(input)
  }

  const updateSelectedRole = async (newRole: RoleDetails) => {
    const selectedRole = await updateRemoteSelectedRole(newRole)
    setRolesWithAccess(selectedRole.rolesWithAccess)
    setSelectedRole(newRole)
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
      cognitoSignIn,
      cognitoSignOut,
      clearAuthState,
      updateSelectedRole,
      forceCognitoLogout,
      updateTrackerUserInfo
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
