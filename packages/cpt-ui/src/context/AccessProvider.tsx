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

export const AccessContext = createContext<{
  sessionTimeoutInfo: { showModal: boolean; timeLeft: number }
  onStayLoggedIn:() => Promise<void>
  onLogOut: () => Promise<void>
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
    const loggingOut = auth.isSignedIn && auth.isSigningOut
    const concurrent = auth.isSignedIn && auth.isConcurrentSession
    const noRole = auth.isSignedIn && !auth.isSigningIn && !auth.selectedRole
    const authedAtRoot = auth.isSignedIn && !!auth.selectedRole && atRoot

    logger.info(`Requested path: ${path}`)
    if (loggedOut && (!inNoRoleAllowed || atRoot)) {
      return redirect(FRONTEND_PATHS.LOGIN, "Not signed in - redirecting to login page")
    }

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

    if (!loggingOut && noRole && (!inNoRoleAllowed || atRoot)) {
      return redirect(FRONTEND_PATHS.SELECT_YOUR_ROLE, `No selected role - Redirecting from ${path}`)
    }

    if (authedAtRoot) {
      return redirect(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID,
        "Authenticated user on root path - redirecting to search")
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
        } else {
          const remainingTime = response.remainingSessionTime
          if (remainingTime !== undefined) {
            const twoMinutes = 14 * 60 * 1000

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
            // No remaining session time info available, hide modal
            logger.debug("No remainingSessionTime in response - hiding modal")
            setSessionTimeoutInfo({
              showModal: false,
              timeLeft: 0
            })
          }
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

  if (shouldBlockChildren()) {
    return (
      <Layout>
        <LoadingPage />
      </Layout>
    )
  }

  return (
    <AccessContext.Provider value={{
      sessionTimeoutInfo,
      onStayLoggedIn: handleStayLoggedIn,
      onLogOut: handleLogOut
    }}>
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
