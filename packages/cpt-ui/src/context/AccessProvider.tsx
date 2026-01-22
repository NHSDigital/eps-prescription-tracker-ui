import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode
} from "react"
import {useLocation, useNavigate} from "react-router-dom"

import {normalizePath} from "@/helpers/utils"
import {useAuth} from "./AuthProvider"

import {ALLOWED_NO_ROLE_PATHS, FRONTEND_PATHS, PUBLIC_PATHS} from "@/constants/environment"
import {logger} from "@/helpers/logger"
import {handleRestartLogin} from "@/helpers/logout"

export const AccessContext = createContext<Record<string, never> | null>(null)

export const AccessProvider = ({children}: { children: ReactNode }) => {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const shouldBlockChildren = () => {
    // TODO: Investigate moving 'ensureRoleSelected' functionality into this blockChildren
    // This could potentially stop amplify re-trying login on a pre-existing session

    const path = normalizePath(location.pathname)

    // not signed in → block on protected paths, and also block root path to prevent flash
    if (!auth.isSignedIn && !auth.isSigningIn) {
      if (path === "/") {
        logger.info("At root path and not signed in - blocking render")
        return true
      }
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

    const loggedOut = !auth.isSignedIn && !auth.isSigningOut
    const concurrent = auth.isSignedIn && auth.isConcurrentSession
    const noRole = auth.isSignedIn && !auth.isSigningIn && !auth.selectedRole
    const authedAtRoot = auth.isSignedIn && !!auth.selectedRole && atRoot

    logger.info(path)
    if (auth.isSignedIn && path === FRONTEND_PATHS.LOGIN) {
      if (!auth.selectedRole) {
        return redirect(FRONTEND_PATHS.SELECT_YOUR_ROLE, "User already logged in. No role selected.")
      } else {
        return redirect(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID, "User already logged in. Role already selected.")
      }
    }

    if (concurrent && !(PUBLIC_PATHS.includes(path) || path === FRONTEND_PATHS.SESSION_SELECTION)) {
      return redirect(FRONTEND_PATHS.SESSION_SELECTION, "Concurrent session found - redirecting to session selection")
    }

    if (noRole && (!inNoRoleAllowed || atRoot)) {
      return redirect(FRONTEND_PATHS.SELECT_YOUR_ROLE, `No selected role - Redirecting from ${path}`)
    }

    if (authedAtRoot) {
      return redirect(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
        "Authenticated user on root path - redirecting to search")
    }

    if (loggedOut && (!inNoRoleAllowed || atRoot)) {
      return redirect(FRONTEND_PATHS.LOGIN, "Not signed in at root - redirecting to login page")
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
    // If user is signedIn, every minute call tracker user info. If it fails, sign the user out.
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
            handleRestartLogin(auth, response.invalidSessionCause)
          }
        })
      }
    }, 60000) // 60000 ms = 1 minute

    return () => clearInterval(internalId)
  }, [auth.isSignedIn, auth.isSigningIn, location.pathname])

  if (shouldBlockChildren()) {
    return <></>
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
