import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode
} from "react"
import {useLocation, useNavigate} from "react-router-dom"

import {normalizePath} from "@/helpers/utils"
import {useAuth} from "./AuthProvider"
import {getOpenTabCount, getOrCreateTabId, updateOpenTabs} from "@/helpers/tabHelpers"
import {checkForRecentLogoutMarker} from "@/helpers/logout"

import {ALLOWED_NO_ROLE_PATHS, FRONTEND_PATHS, PUBLIC_PATHS} from "@/constants/environment"
import {logger} from "@/helpers/logger"
import {handleSignoutEvent} from "@/helpers/logout"
import {getSearchParams} from "@/helpers/getSearchParams"
import LoadingPage from "@/pages/LoadingPage"
import Layout from "@/Layout"

export const AccessContext = createContext<Record<string, never> | null>(null)

export const AccessProvider = ({children}: {children: ReactNode}) => {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const tabId = getOrCreateTabId()

    updateOpenTabs(tabId, "add")

    const onBeforeUnload = () => {
      updateOpenTabs(tabId, "remove")
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      updateOpenTabs(tabId, "remove")
    }
  }, [])

  const shouldRedirectDueToCrossTabLogout = () => {
    const marker = checkForRecentLogoutMarker()
    if (!marker) {
      return false
    }

    const currentTabId = getOrCreateTabId()
    if (marker.initiatedByTabId === currentTabId) {
      return false
    }

    return getOpenTabCount() > 1
  }

  const shouldBlockChildren = () => {
    const path = normalizePath(location.pathname)

    if ((!auth.isSignedIn || auth.isSigningIn) && !PUBLIC_PATHS.includes(path)) {
      logger.info(`Not signed in fully and trying to access ${path} - blocking render`, auth)
      return true
    }

    if (auth.isSignedIn) {
      if ((path === "/" || path === FRONTEND_PATHS.LOGIN) || !PUBLIC_PATHS.includes(path)) {
        if (auth.isConcurrentSession && (path !== FRONTEND_PATHS.SESSION_SELECTION)) {
          logger.info(`Concurrent session detected on ${path} - blocking render until redirect to session selection`)
          return true
        }

        if (!auth.selectedRole && !ALLOWED_NO_ROLE_PATHS.includes(path)) {
          logger.info(`No role selected on ${path} - blocking render until redirect to select your role`)
          return true
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

      // If another tab has signed out, other tabs will run the redirection logic independently
      // Check if a logout has occurred elsewhere and forward all tabs to logout equally
      // Else subsequent tabs with manipulated state will attempt to logout again or redirect to login
      if (
        path !== FRONTEND_PATHS.LOGOUT &&
        path !== FRONTEND_PATHS.SESSION_LOGGED_OUT &&
        shouldRedirectDueToCrossTabLogout()
      ) {
        return redirect(FRONTEND_PATHS.LOGOUT, "Recent cross-tab logout detected - redirecting to logout page")
      }

      // Transitional states - don't redirect. Login / Logout sequence will take care of it.
      if (auth.isSigningOut && !checkForRecentLogoutMarker()
        && !PUBLIC_PATHS.includes(path) && !auth.invalidSessionCause) {
        return handleSignoutEvent(auth, navigate, "Rule 1", auth.invalidSessionCause)
      }

      // Capture this case to prevent new login session being redirected
      // If the path is select your role
      if (auth.isSigningIn && path === FRONTEND_PATHS.SELECT_YOUR_ROLE) {
        const {codeParams, stateParams, errorParams} = getSearchParams(window)
        if ((codeParams || stateParams) && !errorParams) {
          // Only allow through if a successful login.
          logger.info("User signing in with OAuth - allowing access to path with search params")
          return
        }
        return handleSignoutEvent(auth, navigate, "Rule 2", auth.invalidSessionCause)
      }

      if (checkForRecentLogoutMarker()) {
        logger.info("Recent logout marker found, not redirecting, awaiting completion")
        return
      }

      return redirect(FRONTEND_PATHS.LOGIN, `Not signed in - redirecting to login page ${auth.isSigningIn}`)
    }

    // Signed in - check states in priority order
    if (auth.isSignedIn) {
      if (auth.isSigningOut &&
        (path !== FRONTEND_PATHS.LOGOUT && path !== FRONTEND_PATHS.SESSION_LOGGED_OUT)) {
        return handleSignoutEvent(auth, navigate, "Rule 3", auth.invalidSessionCause)
      }

      if (auth.isConcurrentSession && path !== FRONTEND_PATHS.SESSION_SELECTION) {
        return redirect(FRONTEND_PATHS.SESSION_SELECTION, "Concurrent session found - redirecting to session selection")
      }

      if (!auth.selectedRole && !ALLOWED_NO_ROLE_PATHS.includes(path)) {
        return redirect(FRONTEND_PATHS.SELECT_YOUR_ROLE, `No selected role - Redirecting from ${path}`)
      }

      if (auth.selectedRole && (path === "/" || path === FRONTEND_PATHS.LOGIN)) {
        return redirect(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID, "User already logged in. Role already selected.")
      }
    }
  }

  const checkUserInfo = () => {
    // Check if a user is signed in, if it fails sign the user out
    if (auth.isSigningIn && ALLOWED_NO_ROLE_PATHS.includes(location.pathname)) {
      logger.debug("Not checking user info")
      return
    }

    if (auth.isSignedIn && !auth.isSigningOut && !checkForRecentLogoutMarker()) {
      logger.debug("Refreshing user info")

      auth.updateTrackerUserInfo().then((response) => {
        if (response.error) {
          logger.debug("updateTrackerUserInfo returned error, signing out user", response.error)
          handleSignoutEvent(auth, navigate, "UserInfoCheck", response.invalidSessionCause)
        } else {
          const remainingTime = response.remainingSessionTime
          const remainingSeconds = remainingTime !== undefined ? Math.floor(remainingTime / 1000) : undefined

          if (remainingSeconds !== undefined) {
            const twoMinutes = 2 * 60 // Minutes into seconds

            if (remainingSeconds <= twoMinutes && remainingSeconds > 0) {
              // Show timeout modal when 2 minutes or less remaining
              logger.info("Session timeout warning triggered - showing modal", {
                remainingTime,
                remainingSeconds
              })
              auth.setLogoutModalType("timeout")
              auth.setSessionTimeoutModalInfo({
                showModal: true,
                timeLeft: remainingSeconds,
                buttonDisabled: false,
                action: undefined
              })
            } else if (remainingSeconds <= 0) {
              logger.warn("Session expired - automatically logging out user")
              auth.updateInvalidSessionCause("Timeout")
              handleSignoutEvent(auth, navigate, "Timeout", "Timeout")
            } else {
              // Session still valid, ensure modal is hidden and update time info
              logger.debug("Session still valid - hiding modal if shown", {remainingTime})
              auth.setSessionTimeoutModalInfo({
                showModal: false,
                timeLeft: remainingSeconds,
                buttonDisabled: false,
                action: undefined
              })
            }
          } else {
            // No remaining session time info available - this indicates a session integrity issue
            logger.warn("No remainingSessionTime in response - session may be corrupted, logging out user")
            auth.updateInvalidSessionCause("InvalidSession")
            handleSignoutEvent(auth, navigate, "InvalidSession", "InvalidSession")
          }
        }
      })
    }

    logger.debug("No conditions met - not checking user info")
    return
  }

  useEffect(() => {
    // Note: Any logical assertions should be placed within the function.
    // Any placed here cause developer confusion.

    // Implementation notes: useNavigate as a dependency causes an infinite loop as redirects use it
    ensureRoleSelected()
  }, [
    auth.isSignedIn,
    auth.isSigningIn,
    auth.isSigningOut,
    auth.selectedRole,
    auth.isConcurrentSession,
    location.pathname
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
