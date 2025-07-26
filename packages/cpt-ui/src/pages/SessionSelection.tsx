import {Container, Col, Row} from "nhsuk-react-components"
import {Button} from "@/components/ReactRouterButton"

export default function SessionSelectionPage() {
  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        <Row>
          <Col width="full">
            <h1>You are already logged in to the Prescription Tracker</h1>
            <p>There is a session using these login details in another browser, window or device.</p>
            <p>You can continue to start a new session in this window, but this will end the other session.</p>
            { }
          </Col>
        </Row>

        <Row>
          <Col width="full">
            <Button id="new-session" style={{margin: "8px"}}>Start a new session</Button>
            <Button id="close-session" style={{margin: "8px"}}>Close this window</Button>
          </Col>
        </Row>
      </Container>
    </main>
  )
}
