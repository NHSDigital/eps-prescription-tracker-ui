import React, { useEffect, useState } from "react";
import { BackLink, Col, Container, Row } from "nhsuk-react-components";
import { Link, useLocation } from "react-router-dom";
import { PRESCRIPTION_LIST_PAGE_STRINGS } from "@/constants/ui-strings/PrescriptionListPageStrings";

export default function PrescriptionListPage() {
    // TODO: mock data - in the real implementation, this would come from props or context
    const prescriptionCount = 5;
    const location = useLocation();
    const [backLinkTarget, setBackLinkTarget] = useState<string>(PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET);

    useEffect(() => {
        // parse the current URL's query parameters
        const queryParams = new URLSearchParams(location.search);

        // determine which search page to go back to based on query parameters
        if (queryParams.has('prescriptionId')) {
            setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.PRESCRIPTION_ID_SEARCH_TARGET);
        } else if (queryParams.has('nhsNumber')) {
            setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.NHS_NUMBER_SEARCH_TARGET);
        } else {
            // default fallback
            setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET);
        }
    }, [location]);

    return (
        <>
            <title>{PRESCRIPTION_LIST_PAGE_STRINGS.PAGE_TITLE}</title>
            <main id="prescription-list" data-testid="prescription-list-page">
                <Container className="hero-container">
                    <Row>
                        <Col width="full">
                            <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb">
                                <Link to={backLinkTarget} data-testid="back-link-container">
                                    <BackLink data-testid="go-back-link">{PRESCRIPTION_LIST_PAGE_STRINGS.GO_BACK_LINK_TEXT}</BackLink>
                                </Link>
                            </nav>
                        </Col>
                    </Row>
                    <Row>
                        <Col width="full">
                            <h2 className="nhsuk-heading-l" id="hero-heading" data-testid="hero-heading">
                                {PRESCRIPTION_LIST_PAGE_STRINGS.HEADING}
                            </h2>
                        </Col>
                    </Row>
                </Container>
                <Container className="results-container">
                    <p data-testid="results-heading">
                        <strong data-testid="results-count">
                            {PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_PREFIX}
                            {prescriptionCount}
                            {PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_SUFFIX}
                        </strong>
                    </p>
                    <div data-testid="prescription-results-list">
                        {/* Prescription list items would go here see more here: https://prototype-nhs-eps.herokuapp.com/epsv12/prescription-results?nhsNumber=9726919215#current-prescriptions */}
                    </div>
                </Container>
            </main>
        </>
    );
}
