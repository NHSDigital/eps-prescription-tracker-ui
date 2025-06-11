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
import {RoleDetails, UserDetails} from "@cpt-ui-common/common-types"
import {getTrackerUserInfo, updateRemoteSelectedRole} from "@/helpers/userInfo"

const CIS2SignOutEndpoint = API_ENDPOINTS.CIS2_SIGNOUT_ENDPOINT

export interface AuthContextType {
  error: string | null
  user: string | null
  isSignedIn: boolean
  isSigningIn: boolean
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
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({children}: { children: React.ReactNode }) => {
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useLocalStorageState<string | null>("user", "user", null)
  const [isSignedIn, setIsSignedIn] = useLocalStorageState<boolean>("isSignedIn", "isSignedIn", false)
  const [isSigningIn, setIsSigningIn] = useLocalStorageState<boolean>("isSigningIn", "isSigningIn", false)
  const [rolesWithAccess, setRolesWithAccess] = useLocalStorageState<Array<RoleDetails>>(
    "rolesWithAccess", "rolesWithAccess", [])
  const [rolesWithoutAccess, setRolesWithoutAccess] = useLocalStorageState<Array<RoleDetails>>(
    "rolesWithoutAccess",
    "rolesWithoutAccess",
    [])
  const [hasNoAccess, setHasNoAccess] = useLocalStorageState<boolean>(
    "noAccess",
    "noAccess",
    false
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
    true
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
  }
  /**
   * Set up Hub listener to react to auth events
   */
  useEffect(() => {
    const unsubscribe = Hub.listen("auth", async ({payload}) => {
      console.log("Auth event payload:", payload)
      switch (payload.event) {
        // On successful signIn or token refresh, get the latest user state
        case "signedIn": {
          console.log("Processing signedIn event")
          console.log("User %s logged in", payload.data.username)
          const trackerUserInfo = await getTrackerUserInfo()
          console.log("got the following tracker user info", {trackerUserInfo})
          setRolesWithAccess(trackerUserInfo.rolesWithAccess)
          setRolesWithoutAccess(trackerUserInfo.rolesWithoutAccess)
          setHasNoAccess(trackerUserInfo.hasNoAccess)
          setSelectedRole(trackerUserInfo.selectedRole)
          setUserDetails(trackerUserInfo.userDetails)
          setHasSingleRoleAccess(trackerUserInfo.hasSingleRoleAccess)
          setError(trackerUserInfo.error)

          setIsSignedIn(true)
          setIsSigningIn(false)
          setUser(payload.data.username)
          console.log("Finished the signedIn event ")
          break
        }
        case "tokenRefresh":
          console.log("Processing tokenRefresh event")
          setError(null)
          break
        case "signInWithRedirect":
          console.log("Processing signInWithRedirect event")
          setError(null)
          break

        case "tokenRefresh_failure":
        case "signInWithRedirect_failure":
          console.log("Processing tokenRefresh_failure or signInWithRedirect_failure event")
          clearAuthState()
          setError("An error has occurred during the OAuth flow.")
          break

        case "customOAuthState":
          console.log("Processing customOAuthState event")
          console.log("Custom auth state!", payload)
          break

        case "signedOut":
          console.log("Processing signedOut event")
          clearAuthState()
          setError(null)
          break

        default:
          console.log("Received unknown event", payload)
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
    console.log(`Reconfiguring auth provider on a reload`)
    Amplify.configure(authConfig, {ssr: false})
  }, [])

  /**
   * Sign out process.
   */
  const cognitoSignOut = async () => {
    console.log("Signing out in authProvider...")
    try {
      // we need to sign out of cis2 first before signing out of cognito
      // as otherwise we may possibly not be authed to reach cis2 sign out endpoint
      console.log(`calling ${CIS2SignOutEndpoint}`)
      await http.get(CIS2SignOutEndpoint)
      console.log("Backend CIS2 signout OK!")
      console.log(`calling amplify logout`)
      // this triggers a signedOutEvent which is handled by the hub listener
      // we clear all state in there
      await signOut({global: true})
      console.log("Frontend amplify signout OK!")

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
    setIsSigningIn(true)
    return signInWithRedirect(input)
  }

  const updateSelectedRole = async(newRole: RoleDetails) => {
    await updateRemoteSelectedRole(newRole)
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
      cognitoSignIn,
      cognitoSignOut,
      clearAuthState,
      updateSelectedRole
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
