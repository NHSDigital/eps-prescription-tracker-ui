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
    <main className="nhsuk-main-wrapper">
      <Container>
        <Row>
          <Col width="full">
            <h1>Loading</h1>
            <EpsSpinner />
          </Col>
        </Row>
      </Container>
    </main>
  )
}
