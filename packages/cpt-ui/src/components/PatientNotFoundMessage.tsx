import React from "react"
import {Container, Row, Col} from "nhsuk-react-components"
import {Link} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {STRINGS} from "@/constants/ui-strings/PatientNotFoundMessageStrings"
import EpsBackLink from "@/components/EpsBackLink"
import {sendMetrics} from "@/components/Telemetry"

export default function PatientNotFoundMessage() {
  sendMetrics({
    "metric_name": "no_patient_found",
    "dimension": {"type": "SUMTOTAL", "value": 1}
  })
  return (
    <Container
      className="nhsuk-width-container-fluid patient-not-found-container"
      data-testid="patient-not-found-message"
    >
      <nav className="nhsuk-breadcrumb nhsuk-u-padding-bottom-0 nhsuk-u-padding-left-2" aria-label="Breadcrumb">
        <EpsBackLink data-testid="go-back-link">
          {STRINGS.goBackLink}
        </EpsBackLink>
      </nav>
      <main
        className="nhsuk-main-wrapper nhsuk-main-wrapper--s patient-not-found-main-wrapper"
        id="main-content"
        role="main"
        data-testid="main-content"
      >
        <Row>
          <Col width="full">
            <div
              className="query-results-header nhsuk-u-margin-left-2 nhsuk-u-margin-right-2"
              id="query-summary"
              data-testid="query-summary"
            >
              <h1
                className="patient-not-found-heading nhsuk-heading-l nhsuk-u-margin-bottom-3"
                id="results-header"
                data-testid="patient-not-found-heading"
              >
                {STRINGS.heading}
              </h1>
              <p>{STRINGS.intro}</p>
              <p>{STRINGS.retryMessage}</p>
              <p>
                {STRINGS.alternativeSearch}
                <Link data-testid="patient-not-found-prescription-id-link"
                  to={FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID}>
                  {STRINGS.prescriptionIdLinkText}
                </Link>
                {STRINGS.orText}
                <Link data-testid="patient-not-found-nhs-number-link" to={FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER}>
                  {STRINGS.nhsNumberLinkText}
                </Link>
                {STRINGS.endPunctuation}
              </p>
            </div>
          </Col>
        </Row>
      </main>
    </Container>
  )
}
