import {Container} from "nhsuk-react-components"
import EpsSpinner from "@/components/EpsSpinner"
import {usePageTitle} from "@/hooks/usePageTitle"
import {logger} from "@/helpers/logger"
import {normalizePath} from "@/helpers/utils"
import {LOADING_STRINGS} from "@/constants/ui-strings/LoadingPage"
import {Link} from "react-router-dom"
import {Fragment} from "react"

export default function LoadingPage() {
  usePageTitle("Loading information")
  const path = normalizePath(location.pathname)
  logger.info(`Loading requested path: ${path}`)
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
