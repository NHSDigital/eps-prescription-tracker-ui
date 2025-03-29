import React, {useEffect, useState} from "react"
import {
  BackLink,
  Col,
  Container,
  Row
} from "nhsuk-react-components"
import {Link, useLocation} from "react-router-dom"
import {PRESCRIPTION_LIST_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionListPageStrings"
import {useAccess} from "@/context/AccessProvider"
import {PatientDetails} from "@cpt-ui-common/common-types"

export default function PrescriptionListPage() {
  // TODO: mock data - in the real implementation, this would come from props or context
  const prescriptionCount = 5
  const mockPatient: PatientDetails = {
    nhsNumber: "5900009890",
    prefix: "Mr",
    suffix: "",
    given: "William",
    family: "Wolderton",
    gender: "male",
    dateOfBirth: "01-Nov-1988",
    address: {
      line1: "55 OAK STREET",
      line2: "OAK LANE",
      city: "Leeds",
      postcode: "LS1 1XX"
    }
  }

  const location = useLocation()
  const [backLinkTarget, setBackLinkTarget] = useState<string>(PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET)

  const {setPatientDetails} = useAccess()

  useEffect(() => {
    // parse the current URL's query parameters
    const queryParams = new URLSearchParams(location.search)

    // determine which search page to go back to based on query parameters
    if (queryParams.has("prescriptionId")) {
      setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.PRESCRIPTION_ID_SEARCH_TARGET)
    } else if (queryParams.has("nhsNumber")) {
      setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.NHS_NUMBER_SEARCH_TARGET)
    } else {
      // default fallback
      setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET)
    }

    setPatientDetails(mockPatient)
  }, [location])

  return (
    <>
      <title>{PRESCRIPTION_LIST_PAGE_STRINGS.PAGE_TITLE}</title>
      <main id="prescription-list" data-testid="prescription-list-page">
        <Container className="hero-container" data-testid="prescription-list-hero-container">
          <Row>
            <Col width="full">
              <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb" data-testid="prescription-list-nav">
                <Link to={backLinkTarget} data-testid="back-link-container">
                  <BackLink data-testid="go-back-link">{PRESCRIPTION_LIST_PAGE_STRINGS.GO_BACK_LINK_TEXT}</BackLink>
                </Link>
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
