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
import {logger} from "@/helpers/logger"

export const AccessContext = createContext<Record<string, never> | null>(null)

export const AccessProvider = ({children}: { children: ReactNode }) => {

  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const ensureRoleSelected = () => {
    const allowed_no_role_paths = [
      FRONTEND_PATHS.LOGIN,
      FRONTEND_PATHS.LOGOUT,
      FRONTEND_PATHS.COOKIES,
      FRONTEND_PATHS.PRIVACY_NOTICE,
      FRONTEND_PATHS.COOKIES_SELECTED
    ]

    if (!auth.isSignedIn && !auth.isSigningIn) {
      if (!allowed_no_role_paths.includes(normalizePath(location.pathname))) {
        logger.info("Not signed in - redirecting to login page")
        navigate(FRONTEND_PATHS.LOGIN)
      }
      return
    }
    if (!auth.selectedRole && !auth.isSigningIn) {
      if (!allowed_no_role_paths.includes(normalizePath(location.pathname))) {
        logger.info("No selected role - Redirecting from", location.pathname)
        navigate(FRONTEND_PATHS.SELECT_YOUR_ROLE)
      }
      return
    }
  }

  useEffect(() => {
    const currentPath = window.location.pathname
    const onSelectYourRole = currentPath === `/site${FRONTEND_PATHS.SELECT_YOUR_ROLE}`
    if (auth.isSigningIn && onSelectYourRole) {
      return
    }
    ensureRoleSelected()
  }, [auth.isSignedIn, auth.isSigningIn, auth.selectedRole])

  return (
    <AccessContext.Provider value={{}}>
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
