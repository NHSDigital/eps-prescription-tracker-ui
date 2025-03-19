import React from "react";
import { Col, Container, Hero, Row, Button } from "nhsuk-react-components";
import EpsTabs from "@/components/EpsTabs";
import { HERO_TEXT } from "@/constants/ui-strings/SearchForAPrescriptionStrings"

import { useAccess } from "@/context/AccessProvider";

import { PatientDetails } from "@/types/PrescriptionDetailsTypes";

export default function SearchForAPrescriptionPage() {
  const { patientDetails, setPatientDetails } = useAccess()

  const handleClick = () => {
    const newDetails: PatientDetails = {
      identifier: "5900009890",
      name: {
        prefix: "Mr.",
        given: "William",
        family: "Wolderton",
        suffix: ""
      },
      gender: "male",
      birthDate: "01-Nov-1988",
      address: {
        text: "55 OAK STREET, OAK LANE, LEEDS, WEST YORKSHIRE, LS1 1XX",
        line: "55 OAK STREET, OAK LANE",
        city: "LEEDS",
        district: "WEST YORKSHIRE",
        postalCode: "LS1 1XX",
        type: "home", // no idea what these will be
        use: "true"
      }
    }

    console.log("Patient details", patientDetails)
    if (patientDetails) {
      setPatientDetails(undefined)
    } else {
      setPatientDetails(newDetails)
    }
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
          <Button onClick={handleClick}>Fake patient data</Button>
          <Col width="full">
            <EpsTabs />
          </Col>
        </Row>
      </main>
    </>
  )
}
