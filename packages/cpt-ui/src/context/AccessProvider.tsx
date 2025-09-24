import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode
} from "react"
import {useLocation, useNavigate} from "react-router-dom"

import {normalizePath} from "@/helpers/utils"
import {useAuth} from "./AuthProvider"

import {ALLOWED_NO_ROLE_PATHS, FRONTEND_PATHS, AUTH_CONFIG} from "@/constants/environment"
import {logger} from "@/helpers/logger"
import {signOut} from "@/helpers/logout"

export const AccessContext = createContext<Record<string, never> | null>(null)

export const AccessProvider = ({children}: { children: ReactNode }) => {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const shouldBlockChildren = () => {

    const path = normalizePath(location.pathname)

    // not signed in → block on protected paths
    if (!auth.isSignedIn && !auth.isSigningIn) {
      return !ALLOWED_NO_ROLE_PATHS.includes(path)
    }

    // block if concurrent session needs resolution
    if (auth.isConcurrentSession && auth.isSignedIn) {
      return !ALLOWED_NO_ROLE_PATHS.includes(normalizePath(path))
    }

    // block if user needs to select a role (but allow specific paths)
    if (!auth.selectedRole && !auth.isSigningIn && auth.isSignedIn) {
      return (
        ![...ALLOWED_NO_ROLE_PATHS, FRONTEND_PATHS.SELECT_YOUR_ROLE].includes(normalizePath(path))
      )
    }

    return false
  }

  const ensureRoleSelected = () => {
    const path = normalizePath(location.pathname)
    const inNoRoleAllowed = ALLOWED_NO_ROLE_PATHS.includes(path)
    const atRoot = path === "/"

    const redirect = (to: string, msg: string) => {
      logger.info(msg)
      navigate(to)
    }

    const loggedOut = !auth.isSignedIn && !auth.isSigningIn
    const concurrent = auth.isSignedIn && auth.isConcurrentSession
    const noRole = auth.isSignedIn && !auth.isSigningIn && !auth.selectedRole
    const authedAtRoot = auth.isSignedIn && !!auth.selectedRole && atRoot

    if (!loggedOut && path === FRONTEND_PATHS.LOGIN) {
      return redirect(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID, "Already signed in - redirecting to search")
    }

    if (concurrent && !inNoRoleAllowed) {
      return redirect(FRONTEND_PATHS.SESSION_SELECTION, "Concurrent session found - redirecting to session selection")
    }

    if (noRole && !inNoRoleAllowed) {
      return redirect(FRONTEND_PATHS.SELECT_YOUR_ROLE, `No selected role - Redirecting from ${path}`)
    }

    if (authedAtRoot) {
      return redirect(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
        "Authenticated user on root path - redirecting to search")
    }

    if (atRoot) {
      return loggedOut ?
        redirect(FRONTEND_PATHS.LOGIN, "Not signed in - redirecting to login page") :
        redirect(FRONTEND_PATHS.SELECT_YOUR_ROLE, `No selected role - Redirecting from ${path}`)
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
    location.pathname,
    navigate
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
  }, [auth.isSignedIn, auth.isSigningIn, location.pathname])

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
