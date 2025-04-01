import React from "react"
import {
  Col,
  Container,
  Hero,
  Row
} from "nhsuk-react-components"
import {useLocation} from "react-router-dom"
import EpsTabs from "@/components/EpsTabs"
import PrescriptionIdSearch from "@/components/prescriptionSearch/PrescriptionIdSearch"
import NhsNumSearch from "@/components/prescriptionSearch/NhsNumSearch"
import BasicDetailsSearch from "@/components/prescriptionSearch/BasicDetailsSearch"
import {HERO_TEXT} from "@/constants/ui-strings/SearchForAPrescriptionStrings"

export default function SearchPrescriptionPage() {
  const location = useLocation()
  const pathname = location.pathname

  // Map paths directly to content components
  const pathContent: Record<string, React.ReactNode> = {
    "/search-by-prescription-id": <PrescriptionIdSearch />,
    "/search-by-nhs-number": <NhsNumSearch />,
    "/search-by-basic-details": <BasicDetailsSearch />
  }

  // Default to prescription ID search if path not found
  const content = pathContent[pathname] || <PrescriptionIdSearch />

  return (
    <>
      <title>Search for a prescription</title>
      <main id="search-for-a-prescription" data-testid="search-for-a-prescription">
        <Container className="hero-container" data-testid="search-hero-container">
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
        <Container data-testid="search-tabs-container">
          <Row>
            <Col width="full">
              <EpsTabs activeTabPath={pathname}>
                {content}
              </EpsTabs>
            </Col>
          </Row>
        </Container>
      </main>
    </>
  )
}
