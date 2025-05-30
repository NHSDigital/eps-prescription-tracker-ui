import React from "react"
import {
  Container,
  Row,
  Col,
  BackLink
} from "nhsuk-react-components"
import {Link} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {STRINGS} from "@/constants/ui-strings/SearchResultsTooManyStrings"
import {formatDobForDisplay} from "@/helpers/formatters"

export default function SearchResultsTooManyMessage({search = ""}: {search?: string}) {
  // Parse search params (remove leading "?")
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)

  const firstName = params.get("firstName") ?? ""
  const lastName = params.get("lastName") ?? ""
  const dobDay = params.get("dobDay") ?? ""
  const dobMonth = params.get("dobMonth") ?? ""
  const dobYear = params.get("dobYear") ?? ""
  const postcode = params.get("postcode") ?? ""

  return (
    <Container
      className="nhsuk-width-container-fluid patient-search-form-container"
      data-testid="too-many-results-message"
    >
      <nav className="nhsuk-breadcrumb nhsuk-u-padding-bottom-0 nhsuk-u-padding-left-2" aria-label="Breadcrumb">
        <Link to={FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS + (search || "")} data-testid="too-many-results-back-link">
          <BackLink data-testid="go-back-link">
            {STRINGS.goBackLink}
          </BackLink>
        </Link>
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

              <p>{STRINGS.intro}</p>
              <ul data-testid="too-many-results-details-list">
                {firstName && <li>{STRINGS.firstName} {firstName}</li>}
                {lastName && <li>{STRINGS.lastName} {lastName}</li>}
                {(dobDay || dobMonth || dobYear) && (
                  <li>
                    {STRINGS.dob} {formatDobForDisplay({dobDay, dobMonth, dobYear})}
                  </li>
                )}
                {postcode && <li>{STRINGS.postcode} {postcode}</li>}
              </ul>

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
