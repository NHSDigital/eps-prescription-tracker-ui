import React from "react"
import {useAuth} from "@/context/AuthProvider"
import {Container, Col, Row} from "nhsuk-react-components"
import {Link} from "react-router-dom"
import {EpsLogoutStrings} from "@/constants/ui-strings/EpsLogoutPageStrings"
import {usePageTitle} from "@/hooks/usePageTitle"

export default function SessionLoggedOutPage() {
  const auth = useAuth()

  usePageTitle(auth.invalidSessionCause === "ConcurrentSession"
    ? EpsLogoutStrings.PAGE_TITLE
    : EpsLogoutStrings.PAGE_TITLE_ANOTHER_SESSION)

  if (auth.invalidSessionCause === "ConcurrentSession") {
    return (
      <main id="main-content" className="nhsuk-main-wrapper" data-testid="session-logged-out-concurrent">
        <Container>
          <Row>
            <Col width="full">
              <h1 data-testid="concurrent-title">{EpsLogoutStrings.LOGOUT_CONCURRENT_TITLE}</h1>
              <p data-testid="concurrent-description">
                {EpsLogoutStrings.LOGOUT_CONCURRENT_DESCRIPTION}</p>
              <p data-testid="concurrent-contact">
                {EpsLogoutStrings.LOGOUT_CONCURRENT_CONTACT}{" "}
                <a href={`mailto:${EpsLogoutStrings.LOGOUT_CONCURRENT_EMAIL}`} data-testid="nhs-service-desk-email">
                  {EpsLogoutStrings.LOGOUT_CONCURRENT_EMAIL}
                </a>{" "}
                {EpsLogoutStrings.LOGOUT_CONCURRENT_FURTHER}
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
            <h1 data-testid="timeout-title">{EpsLogoutStrings.LOGOUT_TIMEOUT_TITLE}</h1>
            <p data-testid="timeout-description">
              {EpsLogoutStrings.LOGOUT_TIMEOUT_DESCRIPTION}</p>
            <p data-testid="timeout-description2">{EpsLogoutStrings.LOGOUT_TIMEOUT_FURTHER}</p>
            <Link to="/login" data-testid="login-link">{EpsLogoutStrings.LOGIN_LINK}</Link>
          </Col>
        </Row>
      </Container>
    </main>
  )
}
