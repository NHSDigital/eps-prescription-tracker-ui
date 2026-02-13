import {Container} from "nhsuk-react-components"
import EpsSpinner from "@/components/EpsSpinner"
import {usePageTitle} from "@/hooks/usePageTitle"
import {logger} from "@/helpers/logger"
import {normalizePath} from "@/helpers/utils"
import {LOADING_STRINGS} from "@/constants/ui-strings/LoadingPage"
import {Link} from "react-router-dom"
import {Fragment} from "react"
import {useAuth} from "@/context/AuthProvider"
import {useEffect} from "react"

export default function LoadingPage() {
  const auth = useAuth()

  const nonPIDStateValues = {
    error: auth.error,
    user: auth.user,
    isSignedIn: auth.isSignedIn,
    isSigningIn: auth.isSigningIn,
    isSigningOut: auth.isSigningOut,
    isConcurrentSession: auth.isConcurrentSession,
    invalidSessionCause: auth.invalidSessionCause,
    sessionId: auth.sessionId,
    rolesWithAccess: auth.rolesWithAccess,
    rolesWithoutAccess: auth.rolesWithoutAccess,
    selectedRole: auth.selectedRole,
    userDetails: auth.userDetails
  }

  usePageTitle("Loading information")
  const path = normalizePath(location.pathname)

  useEffect(() => {
    const interval = setInterval(() => {
      // Send non-PID state values as additional fields to RUM for better observability of auth state during loading
      logger.error(`Redirection page error timer: ${path}`, nonPIDStateValues)
    }, 10000) // 10000 ms = 10 seconds
    return () => clearInterval(interval)
  }, [path])

  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        <Fragment>
          <h1>{LOADING_STRINGS.HEADER}</h1>
          <p>
            If you have not been redirected after 1 minute,{" "}
            <Link to="/logout">log out</Link>
            {" "}to reset your session and then log in again.
          </p>
          <br />
          <EpsSpinner />
        </Fragment>
      </Container>
    </main>
  )
}
