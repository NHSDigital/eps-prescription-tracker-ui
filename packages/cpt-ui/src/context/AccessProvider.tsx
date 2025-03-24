import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react"

import { useLocalStorageState } from "@/helpers/useLocalStorageState"
import { normalizePath } from '@/helpers/utils'
import { AuthContext } from "./AuthProvider"

import {
  RoleDetails,
  TrackerUserInfo,
  UserDetails,
} from "@/types/TrackerUserInfoTypes"

import { API_ENDPOINTS, NHS_REQUEST_URID } from "@/constants/environment"

import http from "@/helpers/axios"
import { useLocation, useNavigate } from "react-router-dom"

const trackerUserInfoEndpoint = API_ENDPOINTS.TRACKER_USER_INFO
const selectedRoleEndpoint = API_ENDPOINTS.SELECTED_ROLE

export type AccessContextType = {
  noAccess: boolean
  setNoAccess: (value: boolean) => void
  singleAccess: boolean
  setSingleAccess: (value: boolean) => void
  selectedRole: RoleDetails | undefined
  updateSelectedRole: (value: RoleDetails | undefined) => Promise<void>
  userDetails: UserDetails | undefined
  setUserDetails: (value: UserDetails | undefined) => void
  rolesWithAccess: RoleDetails[]
  rolesWithoutAccess: RoleDetails[]
  loading: boolean
  error: string | null
  clear: () => void
}

export const AccessContext = createContext<AccessContextType | undefined>(
  undefined
)

export const AccessProvider = ({ children }: { children: ReactNode }) => {
  const [noAccess, setNoAccess] = useLocalStorageState<boolean>(
    "noAccess",
    "access",
    false
  )
  const [singleAccess, setSingleAccess] = useLocalStorageState<boolean>(
    "singleAccess",
    "access",
    false
  )
  const [selectedRole, setSelectedRole] = useLocalStorageState<RoleDetails | undefined>("selectedRole", "access", undefined)
  const [userDetails, setUserDetails] = useLocalStorageState<UserDetails | undefined>("userDetails", "access", undefined)
  const [usingLocal, setUsingLocal] = useState(true)
  const [rolesWithAccess, setRolesWithAccess] = useState<RoleDetails[]>([])
  const [rolesWithoutAccess, setRolesWithoutAccess] = useState<RoleDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const auth = useContext(AuthContext)

  const navigate = useNavigate()
  const location = useLocation()

  const clear = () => {
    console.log("Clearing access context and local storage...")
    setNoAccess(false)
    setSingleAccess(false)
    setSelectedRole(undefined)
    setUserDetails(undefined)

    // Clear from localStorage to ensure RBAC Banner is removed
    localStorage.removeItem("access")
    localStorage.removeItem("selectedRole")
    localStorage.removeItem("userDetails")
    console.log("Local storage cleared.")
  }

  const fetchTrackerUserInfo = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await http.get(trackerUserInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${auth?.idToken}`,
          "NHSD-Session-URID": NHS_REQUEST_URID,
        },
      })

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

      // The current role may be either undefined, or an empty object. If it's empty, set it undefined.
      let currentlySelectedRole = userInfo.currently_selected_role
      if (
        !currentlySelectedRole ||
        Object.keys(currentlySelectedRole).length === 0
      ) {
        currentlySelectedRole = undefined
      }

      setRolesWithAccess(userInfo.roles_with_access || [])
      setRolesWithoutAccess(userInfo.roles_without_access || [])
      setSelectedRole(currentlySelectedRole)
      setUserDetails(userInfo.user_details)
      setNoAccess(userInfo.roles_with_access.length === 0)
      setSingleAccess(userInfo.roles_with_access.length === 1)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch user info"
      )
      console.error("Error fetching tracker user info:", err)
    } finally {
      setLoading(false)
      setUsingLocal(false)
    }
  }

  const ensureRoleSelected = () => {
    const allowed_no_role_paths = [
      "/selectyourrole",
      "/login",
      "/logout"
    ]

    if (!selectedRole) {
      if (!allowed_no_role_paths.includes(normalizePath(location.pathname))) {
        console.log("Redirecting from", location.pathname)
        navigate("/selectyourrole")
      }
    }
  }

  // The access variables are cached, and the values are initially assumed to have not changed.
  // On a full page reload, make a tracker use info call to update them from the backend
  useEffect(() => {
    const updateAccessVariables = async () => {
      try {
        await fetchTrackerUserInfo()
      } catch (error) {
        console.error(
          "Access provider failed to fetch roles with access:",
          error
        )
      }
    }

    if (!usingLocal) {
      return
    }

    console.log(
      "Access context detected a page load, and we are using local storage fallback. Updating from backend..."
    )

    if (
      !auth?.isSignedIn ||
      !auth?.idToken
    ) {
      return
    }
    // Now that we know there is an id token, check that it has a toString property.
    // For some reason, it doesn't have this immediately, it gets added after a brief pause.
    if (!auth?.idToken.hasOwnProperty("toString")) {
      return
    }

    updateAccessVariables()
    setUsingLocal(false)

    ensureRoleSelected()
  }, [auth?.idToken]) // run ONLY ONCE on mount (i.e. on initial page load)

  const updateSelectedRole = async (newRole: RoleDetails | undefined) => {
    try {
      // Update selected role in the backend via the selectedRoleLambda endpoint using axios
      const response = await http.put(
        selectedRoleEndpoint,
        { currently_selected_role: newRole },
        {
          headers: {
            Authorization: `Bearer ${auth?.idToken?.toString()}`,
            "Content-Type": "application/json",
            "NHSD-Session-URID": NHS_REQUEST_URID,
          },
        }
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

  return (
    <AccessContext.Provider
      value={{
        noAccess,
        setNoAccess,
        singleAccess,
        setSingleAccess,
        selectedRole,
        updateSelectedRole,
        userDetails,
        setUserDetails,
        rolesWithAccess,
        rolesWithoutAccess,
        loading,
        error,
        clear,
      }}
    >
      {children}
    </AccessContext.Provider>
  )
}

export const useAccess = () => {
  const context = useContext(AccessContext)
  if (!context) {
    throw new Error("useAccess must be used within an AccessProvider")
  }
  return context
}
