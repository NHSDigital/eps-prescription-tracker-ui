import React from "react"
import {
  Container,
  Row,
  Col,
  BackLink
} from "nhsuk-react-components"
import {Link} from "react-router-dom"
import {STRINGS} from "@/constants/ui-strings/UnknownErrorMessageStrings"
import {buildBackLink, determineSearchType} from "@/helpers/prescriptionNotFoundLinks"
import {useSearchContext} from "@/context/SearchProvider"

export default function UnknownErrorMessage() {
  const searchContext = useSearchContext()
  const searchType = determineSearchType(searchContext)
  const backLinkUrl = buildBackLink(searchType)
  return (
    <Container
      className="nhsuk-width-container-fluid unknown-error-container"
      data-testid="unknown-error-message"
    >
      <nav
        className="nhsuk-breadcrumb nhsuk-u-padding-bottom-0 nhsuk-u-padding-left-2 unknown-error-breadcrumb"
        aria-label="Breadcrumb"
      >
        <BackLink
          data-testid="go-back-link"
          asElement={Link}
          to={backLinkUrl}
        >
          {STRINGS.goBackLink}
        </BackLink>
      </nav>
      <main
        className="nhsuk-main-wrapper nhsuk-main-wrapper--s unknown-error-main-wrapper"
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
                className="nhsuk-heading-xl nhsuk-u-margin-bottom-3"
                id="results-header"
                data-testid="unknown-error-heading"
              >
                {STRINGS.heading}
              </h1>
              <p data-testid="error-intro">{STRINGS.intro}</p>
            </div>
          </Col>
        </Row>
      </main>
    </Container>
  )
}
