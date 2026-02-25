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
import {ENV_CONFIG} from "@/constants/environment"
import {returnLocalState} from "@/helpers/appLocalStateOutput"

export default function LoadingPage() {
  const auth = useAuth()

  usePageTitle("Loading information")
  const path = normalizePath(location.pathname)

  useEffect(() => {
    const stateValues = returnLocalState(auth)
    const timeout = setTimeout(() => {
      // Send non-PID state values as additional fields to RUM for better observability of auth state during loading
      logger.info("Redirection page error timer triggered")
      logger.debug("Redirection page error timer", {...stateValues, path}, true)
    }, ENV_CONFIG.RUM_ERROR_TIMER_INTERVAL) // set to 10 seconds to allow for slow connections

    return () => clearTimeout(timeout)
  }, [])

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
