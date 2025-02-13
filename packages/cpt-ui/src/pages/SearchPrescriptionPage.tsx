import React, {useContext} from "react"
import {Col, Container, Hero, Row} from "nhsuk-react-components"
import EpsTabs from "@/components/EpsTabs"
import {HERO_TEXT} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {AuthContext} from "@/context/AuthProvider"

const prescriptionDetailsEndpoint = "/api/prescription-details"

export default function SearchForAPrescriptionPage() {
  // AEA-4752: Testing prescriptionDetailsLambda integration
  const auth = useContext(AuthContext)

  const handlePrescriptionDetails = async (e: React.MouseEvent) => {
    e.preventDefault()

    const prescriptionId = "C0C757-A83008-C2D93O"
    const url = `${prescriptionDetailsEndpoint}?prescriptionId=${prescriptionId}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${auth?.idToken}`,
          'NHSD-Session-URID': '555254242106'
        }
      })

      const data = await response.json()
      console.log("Response:", data)

      if (!response.ok) {
        throw new Error('Failed to retrieve prescription details')
      }

    } catch (error) {
      console.error('Error retrieving prescription details:', error)
    }
  }
  // End AEA-4752

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
          {/* AEA-4752: Test button for prescriptionDetailsLambda */}
          <Container className="nhsuk-width-container">
            <Col width="full">
              <button className="nhsuk-button" onClick={handlePrescriptionDetails}>
                Retrieve prescription details
              </button>
            </Col>
          </Container>
          {/* End AEA-4752 */}
        </Row>
      </main>
    </>
  )
}
