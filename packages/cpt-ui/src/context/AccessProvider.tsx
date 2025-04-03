import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from "react"
import {useLocation, useNavigate} from "react-router-dom"

import {useLocalStorageState} from "@/helpers/useLocalStorageState"
import {normalizePath} from "@/helpers/utils"
import {AuthContext} from "./AuthProvider"

import {RoleDetails, TrackerUserInfo, UserDetails} from "@/types/TrackerUserInfoTypes"

import {API_ENDPOINTS, FRONTEND_PATHS, NHS_REQUEST_URID} from "@/constants/environment"

import http from "@/helpers/axios"

const trackerUserInfoEndpoint = API_ENDPOINTS.TRACKER_USER_INFO
const selectedRoleEndpoint = API_ENDPOINTS.SELECTED_ROLE

export type AccessContextType = {
  noAccess: boolean
  setNoAccess: (value: boolean) => void
  singleAccess: boolean
  setSingleAccess: (value: boolean) => void
  selectedRole: RoleDetails | undefined
  updateSelectedRole: (value: RoleDetails) => Promise<void>
  userDetails: UserDetails | undefined
  setUserDetails: (value: UserDetails | undefined) => void
  rolesWithAccess: Array<RoleDetails>
  rolesWithoutAccess: Array<RoleDetails>
  loading: boolean
  error: string | null
  clear: () => void
}

export const AccessContext = createContext<AccessContextType | undefined>(
  undefined
)

export const AccessProvider = ({children}: { children: ReactNode }) => {
  // These get cached to local storage
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
  const [selectedRole, setSelectedRole] = useLocalStorageState<RoleDetails | undefined>(
    "selectedRole",
    "access",
    undefined
  )
  const [userDetails, setUserDetails] = useLocalStorageState<UserDetails | undefined>(
    "userDetails",
    "access",
    undefined
  )

  // These are reset on a page reload
  const [usingLocal, setUsingLocal] = useState(true)
  const [rolesWithAccess, setRolesWithAccess] = useState<Array<RoleDetails>>([])
  const [rolesWithoutAccess, setRolesWithoutAccess] = useState<Array<RoleDetails>>([])
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
          "NHSD-Session-URID": NHS_REQUEST_URID
        }
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
      FRONTEND_PATHS.SELECT_YOUR_ROLE,
      FRONTEND_PATHS.LOGIN,
      FRONTEND_PATHS.LOGOUT
    ]

    if (!selectedRole) {
      if (!allowed_no_role_paths.includes(normalizePath(location.pathname))) {
        console.log("Redirecting from", location.pathname)
        navigate(FRONTEND_PATHS.SELECT_YOUR_ROLE)
      }
    }
  }

  // The access variables are cached, and the values are initially assumed to have not changed.
  // On a full page reload, make a tracker use info call to update them from the backend
  useEffect(() => {
    const updateAccessVariables = async () => {
      // Only fetch tracker user info if selectedRole is missing.
      // This prevents re-fetching on every page load and avoids flickering of the RBAC banner.
      if (!selectedRole){
        try {
          await fetchTrackerUserInfo()
        } catch (error) {
          console.error(
            "Access provider failed to fetch roles with access:",
            error
          )
        }
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
    // eslint-disable-next-line no-prototype-builtins
    if (!auth?.idToken.hasOwnProperty("toString")) {
      return
    }

    updateAccessVariables()
    setUsingLocal(false)

    ensureRoleSelected()
  }, [auth?.idToken]) // run ONLY ONCE on mount (i.e. on initial page load)

  const updateSelectedRole = async (newRole: RoleDetails) => {
    try {
      // Update selected role in the backend via the selectedRoleLambda endpoint using axios
      const response = await http.put(
        selectedRoleEndpoint,
        {currently_selected_role: newRole},
        {
          headers: {
            Authorization: `Bearer ${auth?.idToken?.toString()}`,
            "Content-Type": "application/json",
            "NHSD-Session-URID": NHS_REQUEST_URID
          }
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
        clear
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
