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

    switch (auth.authStatus) {
      case "signing_in":
      case "signing_out":
        // During transitions, show loading to prevent flash of wrong content
        return !ALLOWED_NO_ROLE_PATHS.includes(path) && path !== "/"

      case "signed_out": {
        if (path === "/") {
          logger.info("At root path and not signed in - blocking render")
          return true
        }
        return !ALLOWED_NO_ROLE_PATHS.includes(path)
      }

      case "signed_in": {
        // block if concurrent session needs resolution
        if (auth.isConcurrentSession) {
          return !ALLOWED_NO_ROLE_PATHS.includes(path)
        }
        // block if user needs to select a role (but allow specific paths)
        if (!auth.selectedRole) {
          return ![...ALLOWED_NO_ROLE_PATHS, FRONTEND_PATHS.SELECT_YOUR_ROLE].includes(path)
        }
        return false
      }
    }
  }

  const ensureRoleSelected = () => {
    const path = normalizePath(location.pathname)
    const inNoRoleAllowed = ALLOWED_NO_ROLE_PATHS.includes(path)
    const atRoot = path === "/"

    const redirect = (to: string, msg: string) => {
      logger.info(msg)
      navigate(to)
    }

    logger.info(path)

    switch (auth.authStatus) {
      case "signing_in":
      case "signing_out":
        // During transitions, don't redirect — prevents the race condition
        // where sign-out was matching the "no role" branch
        return

      case "signed_out": {
        if (!inNoRoleAllowed || atRoot) {
          return redirect(FRONTEND_PATHS.LOGIN, "Not signed in at root - redirecting to login page")
        }
        return
      }

      case "signed_in": {
        // Signed-in user hitting login page
        if (path === FRONTEND_PATHS.LOGIN) {
          if (!auth.selectedRole) {
            return redirect(FRONTEND_PATHS.SELECT_YOUR_ROLE, "User already logged in. No role selected.")
          } else {
            return redirect(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID, "User already logged in. Role already selected.")
          }
        }

        // Concurrent session takes priority
        if (auth.isConcurrentSession && !(PUBLIC_PATHS.includes(path) || path === FRONTEND_PATHS.SESSION_SELECTION)) {
          return redirect(FRONTEND_PATHS.SESSION_SELECTION,
            "Concurrent session found - redirecting to session selection")
        }

        // No role selected — force role selection
        if (!auth.selectedRole && (!inNoRoleAllowed || atRoot)) {
          return redirect(FRONTEND_PATHS.SELECT_YOUR_ROLE, `No selected role - Redirecting from ${path}`)
        }

        // Fully authed at root — send to default page
        if (auth.selectedRole && atRoot) {
          return redirect(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
            "Authenticated user on root path - redirecting to search")
        }

        return
      }
    }
  }

  const checkUserInfo = () => {
    // Check if a user is signed in, if it fails sign the user out.
    if (auth.authStatus === "signing_in" || ALLOWED_NO_ROLE_PATHS.includes(location.pathname)) {
      logger.debug("Not checking user info")
      return
    }

    if (auth.authStatus === "signed_in") {
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
    if (auth.authStatus === "signing_in" && onSelectYourRole) {
      return
    }
    ensureRoleSelected()
  }, [
    auth.authStatus,
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
  }, [auth.authStatus, location.pathname])

  if (shouldBlockChildren()) {
    return (
      <Layout>
        <LoadingPage />
      </Layout>
    )
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
