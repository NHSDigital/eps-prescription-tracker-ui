import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useState,
  useCallback
} from "react"
import {useLocation, useNavigate} from "react-router-dom"

import {normalizePath} from "@/helpers/utils"
import {useAuth} from "./AuthProvider"
import {updateRemoteSelectedRole} from "@/helpers/userInfo"
import {signOut} from "@/helpers/logout"

import {
  ALLOWED_NO_ROLE_PATHS,
  FRONTEND_PATHS,
  PUBLIC_PATHS,
  AUTH_CONFIG}
  from "@/constants/environment"
import {logger} from "@/helpers/logger"
import {handleRestartLogin} from "@/helpers/logout"
import LoadingPage from "@/pages/LoadingPage"
import Layout from "@/Layout"
import {getSearchParams} from "@/helpers/getSearchParams"

export const AccessContext = createContext<{
  sessionTimeoutInfo: { showModal: boolean; timeLeft: number }
  onStayLoggedIn:() => Promise<void>
  onLogOut: () => Promise<void>
  onTimeout: () => Promise<void>
    } | null>(null)

export const AccessProvider = ({children}: { children: ReactNode }) => {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [sessionTimeoutInfo, setSessionTimeoutInfo] = useState<{
    showModal: boolean
    timeLeft: number
  }>({showModal: false, timeLeft: 0})

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

      // Transitional states - don't redirect. Login / Logout sequence will take care of it.
      if (auth.isSigningOut && !PUBLIC_PATHS.includes(path) && !auth.invalidSessionCause) {
        return handleRestartLogin(auth, auth.invalidSessionCause, navigate)
      }

      // Capture this case to prevent new login session being redirected
      // If the path is select your role
      if (auth.isSigningIn && path === FRONTEND_PATHS.SELECT_YOUR_ROLE) {
        const {codeParams, stateParams} = getSearchParams(window)
        if (codeParams || stateParams) {
          logger.info("User signing in with OAuth - allowing access to path with search params")
          return
        }
        return handleRestartLogin(auth, auth.invalidSessionCause, navigate)
      }

      return redirect(FRONTEND_PATHS.LOGIN, "Not signed in - redirecting to login page")
    }

    // Signed in - check states in priority order
    if (auth.isSignedIn) {
      if (auth.isSigningOut &&
        (path !== FRONTEND_PATHS.LOGOUT && path !== FRONTEND_PATHS.SESSION_LOGGED_OUT)) {
        // TODO: Check if && !auth.invalidSessionCause needed
        return handleRestartLogin(auth, auth.invalidSessionCause, navigate)
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

  const handleStayLoggedIn = useCallback(async () => {
    try {
      logger.info("User chose to extend session")

      // Call the selectedRole API with current role to refresh session
      if (auth.selectedRole) {
        await updateRemoteSelectedRole(auth.selectedRole)
        logger.info("Session extended successfully")

        // Hide modal and refresh user info
        setSessionTimeoutInfo({showModal: false, timeLeft: 0})
        await auth.updateTrackerUserInfo()
      } else {
        logger.error("No selected role available to extend session")
        await handleLogOut()
      }
    } catch (error) {
      logger.error("Error extending session:", error)
      await handleLogOut()
    }
  }, [auth])

  const handleLogOut = useCallback(async () => {
    logger.info("User chose to log out from session timeout modal")
    setSessionTimeoutInfo({showModal: false, timeLeft: 0})
    await signOut(auth, AUTH_CONFIG.REDIRECT_SIGN_OUT)
  }, [auth])

  const handleTimeout = useCallback(async () => {
    logger.warn("Session automatically timed out")
    setSessionTimeoutInfo({showModal: false, timeLeft: 0})
    auth.updateInvalidSessionCause("Timeout")
    await handleRestartLogin(auth, "Timeout")
  }, [auth])

  const checkUserInfo = () => {
    // Check if a user is signed in, if it fails sign the user out
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
        } else {
          const remainingTime = response.remainingSessionTime
          if (remainingTime !== undefined) {
            const twoMinutes = 2 * 60 * 1000

            logger.debug("Session time check", {
              remainingTime,
              remainingMinutes: Math.floor(remainingTime / 60000),
              twoMinuteThreshold: twoMinutes
            })

            if (remainingTime <= twoMinutes && remainingTime > 0) {
              // Show timeout modal when 2 minutes or less remaining
              logger.info("Session timeout warning triggered - showing modal", {
                remainingTime,
                remainingSeconds: Math.floor(remainingTime / 1000)
              })
              setSessionTimeoutInfo({
                showModal: true,
                timeLeft: remainingTime
              })
            } else if (remainingTime <= 0) {
              logger.warn("Session expired - automatically logging out user")
              auth.updateInvalidSessionCause("Timeout")
              handleRestartLogin(auth, "Timeout")
            } else {
              // Session still valid, ensure modal is hidden and update time info
              logger.debug("Session still valid - hiding modal if shown", {remainingTime})
              setSessionTimeoutInfo({
                showModal: false,
                timeLeft: remainingTime
              })
            }
          } else {
            // No remaining session time info available - this indicates a session integrity issue
            logger.warn("No remainingSessionTime in response - session may be corrupted, logging out user")
            auth.updateInvalidSessionCause("InvalidSession")
            handleRestartLogin(auth, "InvalidSession")
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
    <AccessContext.Provider value={{
      sessionTimeoutInfo,
      onStayLoggedIn: handleStayLoggedIn,
      onLogOut: handleLogOut,
      onTimeout: handleTimeout
    }}>
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
