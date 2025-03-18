import React from "react";
import { BackLink, Col, Container, Hero, Row, Header } from "nhsuk-react-components";
import { Link } from "react-router-dom";

export default function PrescriptionListPage() {
    // Mock data - in a real implementation, this would come from props or context
    const prescriptionCount = 5;

    return (
        <>
            <title>Prescriptions list</title>
            <main id="prescription-list" data-testid="prescription-list-page">
                <Container className="hero-container">
                    <Row>
                        <Col width="full">
                            <Link to="/searchforaprescription">
                                <BackLink data-testid="go-back-link">Go back</BackLink>
                            </Link>
                        </Col>
                    </Row>
                    <Row>
                        <Col width="full">
                            {/* <Hero className="nhsuk-hero-wrapper" data-testid="hero-banner"> */}
                            <h2 className="nhsuk-heading-l" id="hero-heading" data-testid="hero-heading">
                                Prescriptions list
                            </h2>
                            {/* </Hero> */}
                        </Col>
                    </Row>
                </Container>
                <Container className="results-container">
                    <p data-testid="results-heading">
                        <strong data-testid="results-count">We found {prescriptionCount} results</strong>
                    </p>
                    <div data-testid="prescription-results-list">
                        {/* Prescription list items would go here see more here: https://prototype-nhs-eps.herokuapp.com/epsv12/prescription-results?nhsNumber=9726919215#current-prescriptions */}
                    </div>
                </Container>

            </main >
        </>
    );
}
