import React from "react"
import {useAuth} from "@/context/AuthProvider"
import {Container, Col, Row} from "nhsuk-react-components"
import {Link} from "react-router-dom"
import {EpsLogoutStrings} from "@/constants/ui-strings/EpsLogoutPageStrings"

export default function SessionLoggedOutPage() {
  const auth = useAuth()

  if (auth.invalidSessionCause === "ConcurrentSession") {
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
              <Link to="/login">{EpsLogoutStrings.login_link}</Link>
            </Col>
          </Row>
        </Container>
      </main>
    )
  }
  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        <Row>
          <Col width="full">
            <h1>For your security, we have logged you out</h1>
            <p>We have logged you out because you did not do anything for 15 minutes.</p>
            <p>This is to protect patient information.</p>
            <Link to="/login">{EpsLogoutStrings.login_link}</Link>
          </Col>
        </Row>
      </Container>
    </main>
  )
}
