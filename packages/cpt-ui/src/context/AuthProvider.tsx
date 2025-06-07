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
  AuthUser,
  SignInWithRedirectInput
} from "aws-amplify/auth"
import {authConfig} from "./configureAmplify"

import {useLocalStorageState} from "@/helpers/useLocalStorageState"
import {API_ENDPOINTS} from "@/constants/environment"

import http from "@/helpers/axios"
import {RoleDetails, TrackerUserInfo, UserDetails} from "@/types/TrackerUserInfoTypes"

const CIS2SignOutEndpoint = API_ENDPOINTS.CIS2_SIGNOUT_ENDPOINT

export interface AuthContextType {
  error: string | null
  user: AuthUser | null
  isSignedIn: boolean
  isSigningIn: boolean
  rolesWithAccess: Array<RoleDetails>
  rolesWithoutAccess: Array<RoleDetails>
  noAccess: boolean
  singleAccess: boolean
  selectedRole: RoleDetails | undefined
  userDetails: UserDetails | undefined
  cognitoSignIn: (input?: SignInWithRedirectInput) => Promise<void>
  cognitoSignOut: () => Promise<void>
  updateSelectedRole: (value: RoleDetails) => Promise<void>
  clearAuthState: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({children}: { children: React.ReactNode }) => {
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useLocalStorageState<AuthUser | null>("user", "user", null)
  const [isSignedIn, setIsSignedIn] = useLocalStorageState<boolean>("isSignedIn", "isSignedIn", false)
  const [isSigningIn, setIsSigningIn] = useLocalStorageState<boolean>("isSigningIn", "isSigningIn", false)
  const [rolesWithAccess, setRolesWithAccess] = useLocalStorageState<Array<RoleDetails>>(
    "rolesWithAccess", "rolesWithAccess", [])
  const [rolesWithoutAccess, setRolesWithoutAccess] = useLocalStorageState<Array<RoleDetails>>(
    "rolesWithoutAccess",
    "rolesWithoutAccess",
    [])
  const [noAccess, setNoAccess] = useLocalStorageState<boolean>(
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
  const [singleAccess, setSingleAccess] = useLocalStorageState<boolean>(
    "singleAccess",
    "singleAccess",
    false
  )
  /**
   * Fetch and update the auth tokens
   */

  const getTrackerUserInfo = async () => {
    setError(null)

    try {
      console.log("calling tracker user info endpoint")
      const response = await http.get(API_ENDPOINTS.TRACKER_USER_INFO)

      if (response.status !== 200) {
        throw new Error(
          `Server did not return user info, response ${response.status}`
        )
      }

      const data = response.data

      if (!data.userInfo) {
        throw new Error("Server response did not contain data")
      }

      const userInfo: TrackerUserInfo = data.userInfo

      if (userInfo) {
        if (userInfo.roles_with_access) {
          setRolesWithAccess(userInfo.roles_with_access)
        } else {
          const storedRolesWithAccess = localStorage.getItem("rolesWithAccess")
          if (storedRolesWithAccess) {
            setRolesWithAccess(JSON.parse(storedRolesWithAccess))
          } else {
            setRolesWithAccess([])
          }
        }
      }

      // The current role may be either undefined, or an empty object. If it's empty, set it undefined.
      let currentlySelectedRole = userInfo.currently_selected_role
      if (
        !currentlySelectedRole ||
        Object.keys(currentlySelectedRole).length === 0
      ) {
        currentlySelectedRole = undefined
      }

      setNoAccess(userInfo.roles_with_access.length === 0 && !currentlySelectedRole)
      setRolesWithoutAccess(userInfo.roles_without_access || [])
      setSelectedRole(currentlySelectedRole)
      setUserDetails(userInfo.user_details)
      setSingleAccess(userInfo.roles_with_access.length === 1)
      if (userInfo.roles_with_access.length === 1 && userInfo.roles_without_access.length === 0) {
        await updateSelectedRole(userInfo.roles_with_access[0])
      }

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch user info"
      )
      console.error("Error fetching tracker user info:", err)
    }
  }

  const updateSelectedRole = async (newRole: RoleDetails) => {
    try {
      // Update selected role in the backend via the selectedRoleLambda endpoint using axios
      const response = await http.put(
        API_ENDPOINTS.SELECTED_ROLE,
        {currently_selected_role: newRole}
      )

      if (response.status !== 200) {
        throw new Error("Failed to update the selected role")
      }

      // Update frontend state with selected role
      setSelectedRole(newRole)
    } catch (error) {
      console.error("Error selecting role:", error)
      alert("There was an issue selecting your role. Please notify the EPS team.")
    }
  }

  const clearAuthState = () => {

    setNoAccess(false)
    setSingleAccess(false)
    setSelectedRole(undefined)
    setUserDetails(undefined)
    setRolesWithAccess([])
    setRolesWithoutAccess([])
    setUser(null)
    setIsSignedIn(false)
  }
  /**
   * Set up Hub listener to react to auth events and refresh state or get user information
   */
  useEffect(() => {
    const unsubscribe = Hub.listen("auth", async ({payload}) => {
      console.log("Auth event payload:", payload)
      switch (payload.event) {
        // On successful signIn or token refresh, get the latest user state
        case "signedIn":
          console.log("Processing signedIn event")
          console.log("User %s logged in", payload.data.username)
          await getTrackerUserInfo()
          setIsSignedIn(true)
          setIsSigningIn(false)
          setError(null)
          break
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
   * Reconfigure Amplify on changes to authConfig, then update the user state.
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

  return (
    <AuthContext.Provider value={{
      error,
      user,
      isSignedIn,
      isSigningIn,
      rolesWithAccess,
      rolesWithoutAccess,
      noAccess,
      singleAccess,
      selectedRole,
      userDetails,
      cognitoSignIn,
      cognitoSignOut,
      updateSelectedRole,
      clearAuthState
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
