import React from "react"
import {useAuth} from "@/context/AuthProvider"
import {Container, Col, Row} from "nhsuk-react-components"
import {Link} from "react-router-dom"
import {EpsLogoutStrings} from "@/constants/ui-strings/EpsLogoutPageStrings"
import {usePageTitle} from "@/hooks/usePageTitle"

export default function SessionLoggedOutPage() {
  const auth = useAuth()

  usePageTitle(auth.invalidSessionCause === "ConcurrentSession"
    ? EpsLogoutStrings.pageTitleAnotherSession
    : EpsLogoutStrings.pageTitle)

  if (auth.invalidSessionCause === "ConcurrentSession") {
    return (
      <main id="main-content" className="nhsuk-main-wrapper" data-testid="session-logged-out-concurrent">
        <Container>
          <Row>
            <Col width="full">
              <h1 data-testid="concurrent-title">{EpsLogoutStrings.logoutConcurrentTitle}</h1>
              <p data-testid="concurrent-description">
                {EpsLogoutStrings.logoutConcurrentDescription}</p>
              <p data-testid="concurrent-contact">
                {EpsLogoutStrings.logoutConcurrentContact}{" "}
                <a href={`mailto:${EpsLogoutStrings.logoutConcurrentEmail}`} data-testid="nhs-service-desk-email">
                  {EpsLogoutStrings.logoutConcurrentEmail}
                </a>{" "}
                {EpsLogoutStrings.logoutConcurrentFurther}
              </p>
              <Link to="/login" data-testid="login-link">{EpsLogoutStrings.loginLink}</Link>
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
            <h1 data-testid="timeout-title">{EpsLogoutStrings.logoutTimeoutTitle}</h1>
            <p data-testid="timeout-description">
              {EpsLogoutStrings.logoutTimeoutDescription}</p>
            <p data-testid="timeout-description2">{EpsLogoutStrings.logoutTimeoutFurther}</p>
            <Link to="/login" data-testid="login-link">{EpsLogoutStrings.loginLink}</Link>
          </Col>
        </Row>
      </Container>
    </main>
  )
}
