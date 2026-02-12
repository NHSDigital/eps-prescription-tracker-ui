import {Col, Container, Row} from "nhsuk-react-components"
import EpsSpinner from "@/components/EpsSpinner"
import {usePageTitle} from "@/hooks/usePageTitle"
import {logger} from "@/helpers/logger"
import {normalizePath} from "@/helpers/utils"

export default function LoadingPage() {
  usePageTitle("Loading information")
  const path = normalizePath(location.pathname)
  logger.info(`Loading requested path: ${path}`)
  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        <Row>
          <Col width="full">
            <h1>You're being redirected</h1>
            <p>If you have not been redirected after 1 minute,
              <a href="/logout">log out</a> to reset your session and then log in again.</p>
            <EpsSpinner />
          </Col>
        </Row>
      </Container>
    </main>
  )
}
