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

    if ((!auth.isSignedIn || auth.isSigningIn) && !PUBLIC_PATHS.includes(path)) {
      logger.info(`Not signed in fully and trying to access ${path} - blocking render`, auth)
      return true
    }

    if (auth.isSignedIn) {
      if (auth.isConcurrentSession && path !== FRONTEND_PATHS.SESSION_SELECTION) {
        logger.info(`Concurrent session detected on ${path} - blocking render until redirect to session selection`)
        return true
      }

      if (!auth.selectedRole && path !== FRONTEND_PATHS.SELECT_YOUR_ROLE) {
        logger.info(`No role selected on ${path} - blocking render until redirect to select your role`)
        return (![...ALLOWED_NO_ROLE_PATHS, FRONTEND_PATHS.SELECT_YOUR_ROLE].includes(normalizePath(path)))
      }

      if (auth.selectedRole && (path === "/" || path === FRONTEND_PATHS.LOGIN)) {
        logger.info(`Signed-in user on ${path} - blocking render until redirect`)
        return true
      }

      if (auth.isSigningOut || auth.isSigningIn) {
        // Block render if a user is temporarily in a transition state
        return !ALLOWED_NO_ROLE_PATHS.includes(normalizePath(path))
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
      if (path === "/") {
        logger.info("User at root path - redirecting to login page")
        return redirect(FRONTEND_PATHS.LOGIN, "User at root path - redirecting to login page")
      }

      // Transitional states - don't redirect. Login / Logout sequence will take care of it.
      if (auth.isSigningOut && !PUBLIC_PATHS.includes(path)) {
        return redirect(FRONTEND_PATHS.LOGOUT,
          "Not signed in, transition state on protected page. Redirecting to logout")
      }

      // Capture this case to prevent new login session being redirected
      if (auth.isSigningIn && ALLOWED_NO_ROLE_PATHS.includes(path)) {
        return
      }

      return redirect(FRONTEND_PATHS.LOGIN, "Not signed in - redirecting to login page")
    }

    // Signed in - check states in priority order
    if (auth.isSignedIn) {
      if (auth.isSigningOut && path !== FRONTEND_PATHS.LOGOUT) {
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
    if (auth.isSigningIn && ALLOWED_NO_ROLE_PATHS.includes(location.pathname)) {
      logger.debug("Not checking user info")
      return
    }

    if (auth.isSignedIn && !auth.isSigningOut) {
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
    // Note: Any logical assertions should be placed within the function.
    // Any placed here cause developer confusion.
    logger.info("Ensure role selected")
    ensureRoleSelected()
  }, [
    auth.isSignedIn,
    auth.isSigningIn,
    auth.isSigningOut,
    auth.selectedRole,
    auth.isConcurrentSession
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
  }, [auth.isSignedIn, auth.isSigningIn, location.pathname])

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
