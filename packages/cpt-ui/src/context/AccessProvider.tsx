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
import LoadingPage from "@/pages/LoadingPage"
import Layout from "@/Layout"

export const AccessContext = createContext<Record<string, never> | null>(null)

export const AccessProvider = ({children}: { children: ReactNode }) => {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const shouldBlockChildren = () => {
    const path = normalizePath(location.pathname)

    if (auth.isSignedIn && auth.selectedRole &&
      (path === "/" || path === FRONTEND_PATHS.LOGIN)) {
      logger.info(`Signed-in user on ${path} - blocking render until redirect`)
      return true
    }

    // not signed in → block on protected paths, and also block root path to prevent flash
    if (!auth.isSignedIn && !auth.isSigningIn) {
      if (path === "/") {
        logger.info("At root path and not signed in - blocking render")
        return true
      }
      return !ALLOWED_NO_ROLE_PATHS.includes(path)
    } else if (auth.isSignedIn) {
      // Signed In
      if (auth.isConcurrentSession) {
        // Only session-selection page is allowed
        return !ALLOWED_NO_ROLE_PATHS.includes(normalizePath(path))
      }
      if (auth.isSigningIn || auth.isSigningOut) {
        if (!auth.selectedRole) {
          // Block render if a user doesn't have a role selected - awaiting redirection
          return (
            ![...ALLOWED_NO_ROLE_PATHS, FRONTEND_PATHS.SELECT_YOUR_ROLE].includes(normalizePath(path))
          )
        } else {
          // Block render if a user is temporarily in a transition state
          return !ALLOWED_NO_ROLE_PATHS.includes(normalizePath(path))
        }
      }
    }

    return false
  }

  const ensureRoleSelected = () => {
    const path = normalizePath(location.pathname)

    const redirect = (to: string, msg: string) => {
      logger.info(msg)
      navigate(to)
    }

    if (auth.isSignedIn && auth.selectedRole && (path === "/" || path === FRONTEND_PATHS.LOGIN)) {
      return redirect(
        FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
        `Signed-in user on ${path} - redirecting to default page`
      )
    }

    // Public paths (except root) don't need protection
    if (PUBLIC_PATHS.includes(path) && path !== "/") {
      return
    }

    // Not signed in
    if (!auth.isSignedIn) {
      // Transitional states - don't redirect
      if (auth.isSigningOut) {
        logger.info("User is signing out - not redirecting elsewhere")
        return
      }

      return redirect(FRONTEND_PATHS.LOGIN, "Not signed in - redirecting to login page")
    }

    // Signed in - check states in priority order
    if (auth.isSignedIn) {
      if (auth.isSigningOut) {
        return handleRestartLogin(auth, auth.invalidSessionCause)
      }

      if (auth.isConcurrentSession && path !== FRONTEND_PATHS.SESSION_SELECTION) {
        return redirect(FRONTEND_PATHS.SESSION_SELECTION, "Concurrent session found - redirecting to session selection")
      }

      if (!auth.selectedRole && path !== FRONTEND_PATHS.SELECT_YOUR_ROLE) {
        return redirect(FRONTEND_PATHS.SELECT_YOUR_ROLE, `No selected role - Redirecting from ${path}`)
      }

      if (auth.selectedRole && (path === "/" || path === FRONTEND_PATHS.LOGIN)) {
        return redirect(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID, "User already logged in. Role already selected.")
      }
    }
  }

  const checkUserInfo = () => {
    // Check if a user is signed in, if it fails sign the user out.
    if (auth.isSigningIn === true || ALLOWED_NO_ROLE_PATHS.includes(location.pathname)) {
      logger.debug("Not checking user info")
      return
    }

    if (auth.isSignedIn) {
      logger.debug("Refreshing user info")
      auth.updateTrackerUserInfo().then((response) => {
        if (response.error) {
          logger.debug("Restarting login")
          handleRestartLogin(auth, response.invalidSessionCause)
        }
      })
    }

    return
  }

  useEffect(() => {
    const currentPath = location.pathname
    const onSelectYourRole = currentPath === FRONTEND_PATHS.SELECT_YOUR_ROLE
    if (auth.isSigningIn && onSelectYourRole) {
      return
    }
    logger.info("Ensure role selected")
    ensureRoleSelected()
  }, [
    auth.isSignedIn,
    auth.isSigningIn,
    auth.isSigningOut,
    auth.selectedRole,
    auth.isConcurrentSession,
    location.pathname,
    navigate
  ])

  useEffect(() => {
    // Check if user is logged in on page load.
    logger.debug("On load user info check")
    checkUserInfo()

    // Then check every minute
    const interval = setInterval(() => {
      logger.debug("Periodic user info check")
      checkUserInfo()
    }, 60000) // 60000 ms = 1 minute

    return () => clearInterval(interval)
  }, [auth.isSignedIn, auth.isSigningIn, auth.isSigningOut, location.pathname])

  return (
    <AccessContext.Provider value={{}}>
      {shouldBlockChildren() ? <Layout><LoadingPage /></Layout> : children}
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
