import React from "react"
import {
  Container,
  Row,
  Col,
  BackLink
} from "nhsuk-react-components"
import {Link, useLocation} from "react-router-dom"
import {FRONTEND_PATHS} from "@/constants/environment"
import {STRINGS} from "@/constants/ui-strings/SearchResultsTooManyStrings"
import {formatDob} from "@/helpers/formatters"
import {BasicDetailsSearchType} from "@cpt-ui-common/common-types"

export default function SearchResultsTooManyPage() {
  const location = useLocation()
  const {
    firstName,
    lastName,
    dobDay,
    dobMonth,
    dobYear,
    postcode
  } = (location.state ?? {}) as BasicDetailsSearchType

  return (
    <Container
      className="nhsuk-width-container-fluid patient-search-form-container"
      data-testid="too-many-results-page"
    >
      <nav className="nhsuk-breadcrumb nhsuk-u-padding-bottom-0 nhsuk-u-padding-left-2" aria-label="Breadcrumb">
        <Link to={FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS} data-testid="too-many-results-back-link">
          <BackLink data-testid="go-back-link">{STRINGS.goBackLink}</BackLink>
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
                <li>{STRINGS.lastName} {lastName}</li>
                <li>{STRINGS.dob} {formatDob({dobDay, dobMonth, dobYear})}</li>
                {postcode && <li>{STRINGS.postcode} {postcode}</li>}
              </ul>

              <p id="results-count-text" data-testid="too-many-results-count-text">
                {STRINGS.retryMessage}
                <Link to={FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS}>{STRINGS.retryLinkText}</Link>
                {STRINGS.retryMessageSuffix}
              </p>

              <p data-testid="too-many-results-alt-options">
                {STRINGS.alternativeSearch}
                <Link to={FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER}>{STRINGS.nhsNumberLinkText}</Link>
                {STRINGS.orText}
                <Link to={FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID}>{STRINGS.prescriptionIdLinkText}</Link>
                {STRINGS.endPunctuation}
              </p>
            </div>
          </Col>
        </Row>
      </main>
    </Container>
  )
}
