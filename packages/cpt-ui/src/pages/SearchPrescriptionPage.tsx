import React from "react";
import { Container, Row, Col } from "nhsuk-react-components";

export default function SearchPrescriptionPage() {
  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        <Row>
          <Col width="full">
            <h1
              className="nhsuk-heading-xl"
              data-testid="search_prescription_heading"
            >
              Search for a prescription
            </h1>
          </Col>
        </Row>
      </Container>
    </main>
  );
}
