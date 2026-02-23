import {Container, WarningCallout} from "nhsuk-react-components"
import EpsSpinner from "@/components/EpsSpinner"
import {usePageTitle} from "@/hooks/usePageTitle"
import {logger} from "@/helpers/logger"
import {normalizePath} from "@/helpers/utils"
import {LOADING_STRINGS} from "@/constants/ui-strings/LoadingPage"
import {Link} from "react-router-dom"
import {Fragment, useEffect, useState} from "react"
import {useAuth} from "@/context/AuthProvider"
import {ENV_CONFIG} from "@/constants/environment"
import {returnLocalState} from "@/helpers/appLocalStateOutput"

export default function LoadingPage() {
  const auth = useAuth()
  usePageTitle("Loading information")
  const [showWarningCallout, setShowWarningCallout] = useState<boolean | undefined>(undefined)
  const sessionId = auth?.sessionId ? auth.sessionId?.trim() : undefined
  const desktopId = auth?.desktopId ? auth.desktopId?.trim() : undefined

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowWarningCallout(true)
    }, 15000)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

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
          {!showWarningCallout && <EpsSpinner />}
          {showWarningCallout && (
            <WarningCallout>
              <WarningCallout.Label>
                Information
              </WarningCallout.Label>
              <p>
                If you keep seeing this page, email{" "}
                <a href={`mailto:epssupport@nhs.net?subject=Issue for session ${sessionId}`}>epssupport@nhs.net</a>
                {" "}and include this information:</p>
              <ul>
                {sessionId && <li>session ID {sessionId}</li>}
                <li>desktop ID {desktopId}</li>
              </ul>
            </WarningCallout>
          )}
        </Fragment>
      </Container>
    </main>
  )
}
