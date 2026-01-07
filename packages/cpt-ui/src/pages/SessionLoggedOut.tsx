import React from "react"
import {useAuth} from "@/context/AuthProvider"
import {Container, Col, Row} from "nhsuk-react-components"
import {Link} from "react-router-dom"
import {EpsLogoutStrings} from "@/constants/ui-strings/EpsLogoutPageStrings"

export default function SessionLoggedOutPage() {
  const auth = useAuth()

  if (auth.invalidSessionCause === "ConcurrentSession") {
    return (
      <main id="main-content" className="nhsuk-main-wrapper" data-testid="session-logged-out-concurrent">
        <Container>
          <Row>
            <Col width="full">
              <h1 data-testid="concurrent-title">You have been logged out</h1>
              <p data-testid="concurrent-description">
                We have logged you out because you started another session in a new window or browser.</p>
              <p data-testid="concurrent-contact">
                Contact the NHS national service desk at{" "}
                <a href="mailto:ssd.nationalservicedesk@nhs.net" data-testid="nhs-service-desk-email">
                  ssd.nationalservicedesk@nhs.net
                </a>{" "}
                if you did not start another session in another window or browser.
              </p>
              <Link to="/login" data-testid="login-link">{EpsLogoutStrings.LOGIN_LINK}</Link>
            </Col>
          </Row>
        </Container>
      </main>
    )
  }
  return (
    <main id="main-content" className="nhsuk-main-wrapper" data-testid="session-logged-out-timeout">
      <Container>
        <Row>
          <Col width="full">
            <h1 data-testid="timeout-title">For your security, we have logged you out</h1>
            <p data-testid="timeout-description">
              We have logged you out because you did not do anything for 15 minutes.</p>
            <p data-testid="timeout-description2">This is to protect patient information.</p>
            <Link to="/login" data-testid="login-link">{EpsLogoutStrings.LOGIN_LINK}</Link>
          </Col>
        </Row>
      </Container>
    </main>
  )
}
