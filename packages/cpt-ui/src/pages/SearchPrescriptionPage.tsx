import React from "react"
import {Container, Row, Col, Hero} from "nhsuk-react-components"
import EpsTabs from "@/components/EpsTabs"
import {HERO_TEXT} from "@/constants/ui-strings/SearchForAPrescriptionStrings"

export default function SearchForAPrescriptionPage() {
  return (
    <>
      <title>Search for a prescription</title>
      <main
        id="search-for-a-prescription"
        className="nhsuk-main-wrapper nhsuk-main-wrapper--s"
        data-testid="search-for-a-prescription"
        role="main"
      >
        {/* Hero Banner */}
        <Container className="hero-container" data-testid="search-hero-container">
          <Row>
            <Col width="full">
              <Hero className="nhsuk-hero__wrapper">
                <Hero.Heading
                  className="nhsuk-u-margin-bottom-3"
                  id="hero-heading"
                  data-testid="hero-heading"
                >
                  {HERO_TEXT}
                </Hero.Heading>
              </Hero>
            </Col>
          </Row>
        </Container>

        {/* Tabs */}
        <div className="nhsuk-tab-set find-patient-tabset" data-testid="search-tabs-container">
          <div className="find-patient-tabset__container">
            <EpsTabs />
          </div>
        </div>

        {/* Panel Container */}
        <Container
          className="nhsuk-width-container-fluid patient-search-form-container"
          data-testid="search-form-wrapper"
        >
          <Row>
            <Col width="one-half">
              {/* Form content will be rendered by EpsTabs children */}
            </Col>
          </Row>
        </Container>
      </main>
    </>
  )
}
