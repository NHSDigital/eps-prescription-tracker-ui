import React from "react";
import { Col, Container, Hero, Row, Button } from "nhsuk-react-components";
import EpsTabs from "@/components/EpsTabs";
import { HERO_TEXT } from "@/constants/ui-strings/SearchForAPrescriptionStrings"

import { useAccess } from "@/context/AccessProvider";

import { PatientDetails } from "@cpt-ui-common/common-types";

export default function SearchForAPrescriptionPage() {
  const { setPatientDetails } = useAccess()

  const handleFullClick = () => {
    const newDetails: PatientDetails = {
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

    setPatientDetails(newDetails)
  }

  const handlePartialClick = () => {
    const newDetails: PatientDetails = {
      nhsNumber: "5900009890",
      prefix: "Mr",
      suffix: "",
      given: "William",
      family: "Wolderton",
      gender: null,
      dateOfBirth: null,
      address: null
    }
    setPatientDetails(newDetails)
  }

  const handleClearClick = () => {
    setPatientDetails(undefined)
  }

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
          <Button onClick={handleFullClick}>Complete fake patient data</Button>
          <Button onClick={handlePartialClick}>Partial fake patient data</Button>
          <Button onClick={handleClearClick}>Clear fake patient data</Button>
          <Col width="full">
            <EpsTabs />
          </Col>
        </Row>
      </main>
    </>
  )
}
