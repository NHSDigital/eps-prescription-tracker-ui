import React, {useEffect, useState} from "react"
import {
  BackLink,
  Col,
  Container,
  Row
} from "nhsuk-react-components"
import {Link, useNavigate, useSearchParams} from "react-router-dom"
import {PRESCRIPTION_LIST_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionListPageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

export default function PrescriptionListPage() {
  // TODO: mock data - in the real implementation, this would come from props or context
  const prescriptionCount = 5
  const navigate = useNavigate()
  const [queryParams] = useSearchParams()
  const [backLinkTarget, setBackLinkTarget] = useState<string>(PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET)

  useEffect(() => {
    const hasPrescriptionId = !!queryParams.get("prescriptionId")
    const hasNhsNumber = !!queryParams.get("nhsNumber")

    // determine which search page to go back to based on query parameters
    if (hasPrescriptionId) {
      setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.PRESCRIPTION_ID_SEARCH_TARGET)
    } else if (hasNhsNumber) {
      setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.NHS_NUMBER_SEARCH_TARGET)
    } else {
      // if no search is given, redirect to the not found page
      setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET)
    }

    // If we didn't get any query values, send the user to the not found page
    const options = [hasPrescriptionId, hasNhsNumber]
    if (!options.includes(true)) {
      navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
    }

  }, [queryParams])

  return (
    <>
      <title>{PRESCRIPTION_LIST_PAGE_STRINGS.PAGE_TITLE}</title>
      <main id="prescription-list" data-testid="prescription-list-page">
        <Container className="hero-container" data-testid="prescription-list-hero-container">
          <Row>
            <Col width="full">
              <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb" data-testid="prescription-list-nav">
                <BackLink
                  data-testid="go-back-link"
                  asElement={Link}
                  to={backLinkTarget}
                >
                  {PRESCRIPTION_LIST_PAGE_STRINGS.GO_BACK_LINK_TEXT}
                </BackLink>
              </nav>
            </Col>
          </Row>
          <Row>
            <Col width="full">
              <h2 className="nhsuk-heading-l" data-testid="prescription-list-heading">
                {PRESCRIPTION_LIST_PAGE_STRINGS.HEADING}
              </h2>
            </Col>
          </Row>
        </Container>
        <Container className="results-container" data-testid="prescription-results-container">
          <p data-testid="results-heading">
            <strong data-testid="results-count">
              {PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_PREFIX}
              {prescriptionCount}
              {PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_SUFFIX}
            </strong>
          </p>
          <div data-testid="prescription-results-list">
            {/* Prescription list items would go here */}
          </div>
        </Container>
      </main>
    </>
  )
}
