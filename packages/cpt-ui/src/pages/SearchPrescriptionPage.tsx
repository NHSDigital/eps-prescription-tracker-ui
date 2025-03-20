import React from "react";
import { Col, Container, Hero, Row } from "nhsuk-react-components";
import EpsTabs from "@/components/EpsTabs";
import { HERO_TEXT } from "@/constants/ui-strings/SearchForAPrescriptionStrings"


export default function SearchForAPrescriptionPage() {
  return (
    <>
      <title>Search for a prescription</title>
      <main id="search-for-a-prescription" data-testid="search-for-a-prescription">
        <Container className="hero-container">
          <Row>
            <Col width="full">
              <Hero className="nhsuk-hero-wrapper" data-testid="hero-banner">
                <Hero.Heading className="heroHeading" id="hero-heading" data-testid="hero-heading">
                  {HERO_TEXT}
                </Hero.Heading>
              </Hero>
            </Col>
          </Row>
        </Container>
        <Row>
          <Col width="full">
            <EpsTabs />
          </Col>
        </Row>
      </main>
    </>
  )
}
