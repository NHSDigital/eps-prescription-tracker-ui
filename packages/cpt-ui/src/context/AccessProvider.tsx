import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode
} from "react"
import {useLocation, useNavigate} from "react-router-dom"

import {normalizePath} from "@/helpers/utils"
import {useAuth} from "./AuthProvider"

import {ALLOWED_NO_ROLE_PATHS, FRONTEND_PATHS} from "@/constants/environment"
import {logger} from "@/helpers/logger"

export const AccessContext = createContext<Record<string, never> | null>(null)

export const AccessProvider = ({children}: { children: ReactNode }) => {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const shouldBlockChildren = () => {
    // block if concurrent session needs resolution
    if (auth.isConcurrentSession && auth.isSignedIn) {
      return !ALLOWED_NO_ROLE_PATHS.includes(normalizePath(location.pathname))
    }

    // block if user needs to select a role (but allow specific paths)
    if (!auth.selectedRole && !auth.isSigningIn && auth.isSignedIn) {
      return (
        ![...ALLOWED_NO_ROLE_PATHS, FRONTEND_PATHS.SELECT_YOUR_ROLE].includes(normalizePath(location.pathname))
      )
    }

    return false
  }

  const ensureRoleSelected = () => {
    if (!auth.isSignedIn && !auth.isSigningIn) {
      if (!ALLOWED_NO_ROLE_PATHS.includes(normalizePath(location.pathname))) {
        logger.info("Not signed in - redirecting to login page")
        navigate(FRONTEND_PATHS.LOGIN)
      }
      return
    }
    if (auth.isConcurrentSession && auth.isSignedIn) {
      if (!ALLOWED_NO_ROLE_PATHS.includes(normalizePath(location.pathname))) {
        logger.info(
          "Concurrent session found - redirecting to session selection"
        )
        navigate(FRONTEND_PATHS.SESSION_SELECTION)
      }
      return
    }
    if (!auth.selectedRole && !auth.isSigningIn) {
      if (!ALLOWED_NO_ROLE_PATHS.includes(normalizePath(location.pathname))) {
        logger.info("No selected role - Redirecting from", location.pathname)
        navigate(FRONTEND_PATHS.SELECT_YOUR_ROLE)
      }
      return
    }

    if (auth.isSignedIn && auth.selectedRole && location.pathname === "/") {
      logger.info("Authenticated user on root path - redirecting to search")
      navigate(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
      return
    }
  }

  useEffect(() => {
    const currentPath = location.pathname
    const onSelectYourRole = currentPath === FRONTEND_PATHS.SELECT_YOUR_ROLE
    if (auth.isSigningIn && onSelectYourRole) {
      return
    }
    ensureRoleSelected()
  }, [
    auth.isSignedIn,
    auth.isSigningIn,
    auth.selectedRole,
    auth.isConcurrentSession,
    location.pathname
  ])

  useEffect(() => {
    // If user is signedIn, every 5 minutes call tracker user info. If it fails, sign the user out.
    const internalId = setInterval(() => {
      const currentPath = location.pathname

      if (auth.isSigningIn === true || ALLOWED_NO_ROLE_PATHS.includes(currentPath)) {
        logger.debug("Not checking user info")
        return
      }

      logger.info("Periodic user info check")
      if (auth.isSignedIn) {
        logger.info("Refreshing user info")
        auth.updateTrackerUserInfo().then((response) => {
          if (response.error) {
            navigate(FRONTEND_PATHS.SESSION_LOGGED_OUT)
          }
        })
      }
    }, 300000) // 300000 ms = 5 minutes

    return () => clearInterval(internalId)
  }, [auth.isSignedIn, auth.isSigningIn])

  if (shouldBlockChildren()) {
    return null
  }

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
