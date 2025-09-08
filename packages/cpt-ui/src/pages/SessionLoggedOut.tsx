import {Container, Col, Row} from "nhsuk-react-components"

export default function SessionLoggedOutPage() {
  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        <Row>
          <Col width="full">
            <h1>You have been logged out</h1>
            <p>We have logged you out because you started another session in a new window or browser.</p>
            <p>
              Contact the NHS national service desk at{" "}
              <a href="mailto:ssd.nationalservicedesk@nhs.net">
                ssd.nationalservicedesk@nhs.net
              </a>{" "}
              if you did not start another session in another window or browser.
            </p>
          </Col>
        </Row>
      </Container>
    </main>
  )
}
