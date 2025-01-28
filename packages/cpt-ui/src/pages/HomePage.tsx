import React from "react";
import { Container, Col, Row } from "nhsuk-react-components";

export default function HomePage() {
  return (
    <main className="nhsuk-main-wrapper">
      <Container>
        <Row>
          <Col width="full">
            <h1>Hello World</h1>
            <p>
              Etiam lobortis! dolor ac facilisis efficitur, metus leo posuere
              est, non pharetra orci velit non velit. Class aptent taciti
              sociosqu ad litora torquent per conubia nostra, per inceptos
              himenaeos.
            </p>
          </Col>
        </Row>
      </Container>
    </main>
  );
}
