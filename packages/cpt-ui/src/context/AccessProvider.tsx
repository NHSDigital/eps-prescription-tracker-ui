import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode
} from "react"
import {useLocation, useNavigate} from "react-router-dom"

import {normalizePath} from "@/helpers/utils"
import {useAuth} from "./AuthProvider"

import {FRONTEND_PATHS} from "@/constants/environment"

export const AccessContext = createContext<null>(null)

export const AccessProvider = ({children}: { children: ReactNode }) => {

  const {
    isSignedIn,
    selectedRole,
    isSigningIn
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const ensureRoleSelected = () => {
    const allowed_no_role_paths = [
      FRONTEND_PATHS.PRIVACY_NOTICE,
      FRONTEND_PATHS.LOGIN,
      FRONTEND_PATHS.LOGOUT,
      FRONTEND_PATHS.COOKIES
    ]
    const params = new URLSearchParams(window.location.search)
    const codeParams = params.get("code")
    const stateParams = params.get("state")
    console.log("in AccessProvider.ensureRoleSelected with params", {params, codeParams, stateParams})
    if (codeParams && stateParams) {
      console.log("in a callback so just returning")
      return
    }

    if (!isSignedIn) {
      if (!allowed_no_role_paths.includes(normalizePath(location.pathname))) {
        console.log("Not signed in - redirecting to login page")
        navigate(FRONTEND_PATHS.LOGIN)
      }
      return
    }
    if (!selectedRole && !isSigningIn) {
      if (!allowed_no_role_paths.includes(normalizePath(location.pathname))) {
        console.log("No selected role - Redirecting from", location.pathname)
        navigate(FRONTEND_PATHS.SELECT_YOUR_ROLE)
      }
      return
    }
  }

  // The access variables are cached, and the values are initially assumed to have not changed.
  // On a full page reload, make a tracker use info call to update them from the backend
  useEffect(() => {
    console.log("in accessProvider with these", {isSignedIn, isSigningIn, selectedRole})
    ensureRoleSelected()
  }, [isSignedIn, isSigningIn, selectedRole])

  return (
    <AccessContext.Provider
      value={null}
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
