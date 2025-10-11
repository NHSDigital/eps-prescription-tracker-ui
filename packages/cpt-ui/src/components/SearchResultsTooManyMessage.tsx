import React from "react"
import {Container, Row, Col} from "nhsuk-react-components"
import {Link} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {STRINGS} from "@/constants/ui-strings/SearchResultsTooManyStrings"
import EpsBackLink from "@/components/EpsBackLink"

type SearchResultsTooManyMessageProps = {
  readonly search?: string
}

export default function SearchResultsTooManyMessage({search = ""}: SearchResultsTooManyMessageProps) {
  return (
    <Container
      className="nhsuk-width-container-fluid patient-search-form-container"
      data-testid="too-many-results-container"
    >
      <nav className="nhsuk-breadcrumb nhsuk-u-padding-bottom-0 nhsuk-u-padding-left-2" aria-label="Breadcrumb">
        <EpsBackLink data-testid="go-back-link">
          {STRINGS.goBackLink}
        </EpsBackLink>
      </nav>
      <main
        className="nhsuk-main-wrapper nhsuk-main-wrapper--s patient-search-main-wrapper"
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
                className="nhsuk-heading-m nhsuk-u-margin-bottom-3"
                id="results-header"
                data-testid="too-many-results-heading"
              >
                {STRINGS.heading}
              </h1>

              <p id="results-message" data-testid="too-many-results-message">
                {STRINGS.resultsMessage}
              </p>

              <p id="results-count-text" data-testid="too-many-results-count-text">
                {STRINGS.retryMessage}
                <Link
                  data-testid="too-many-results-basic-details-link"
                  to={FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS + (search || "")}>
                  {STRINGS.basicDetailsLinkText}
                </Link>
                {STRINGS.retryMessageSuffix}
              </p>

              <p data-testid="too-many-results-alt-options">
                {STRINGS.alternativeSearch}
                <Link
                  data-testid="too-many-results-nhs-number-link"
                  to={FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER}>{STRINGS.nhsNumberLinkText}</Link>
                {STRINGS.orText}
                <Link
                  data-testid="too-many-results-prescription-id-link"
                  to={FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID}>{STRINGS.prescriptionIdLinkText}</Link>
                {STRINGS.endPunctuation}
              </p>
            </div>
          </Col>
        </Row>
      </main>
    </Container>
  )
}
