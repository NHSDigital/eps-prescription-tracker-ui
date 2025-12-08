import React, {Fragment, useState, useEffect} from "react"
import {
  Col,
  Container,
  Hero,
  Row
} from "nhsuk-react-components"
import {useLocation, useNavigate} from "react-router-dom"

import TabSet from "@/components/tab-set"
import PrescriptionIdSearch from "@/components/prescriptionSearch/PrescriptionIdSearch"
import NhsNumSearch from "@/components/prescriptionSearch/NhsNumSearch"
import BasicDetailsSearch from "@/components/prescriptionSearch/BasicDetailsSearch"

import {HERO_TEXT} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {PRESCRIPTION_SEARCH_TABS} from "@/constants/ui-strings/SearchTabStrings"

export default function SearchPrescriptionPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname

  const [activeTab, setActiveTab] = useState(0)

  const pathToIndex: Record<string, number> = {
    "/search-by-prescription-id": 0,
    "/search-by-nhs-number": 1,
    "/search-by-basic-details": 2
  }

  // Map paths directly to content components
  const pathContent: Record<string, React.ReactNode> = {
    "/search-by-prescription-id": <PrescriptionIdSearch />,
    "/search-by-nhs-number": <NhsNumSearch />,
    "/search-by-basic-details": <BasicDetailsSearch />
  }

  // Update active tab when pathname changes
  useEffect(() => {
    const tabIndex = pathToIndex[pathname] ?? 0
    setActiveTab(tabIndex)
  }, [pathname])

  const handleTabClick = (tabIndex: number) => {
    setActiveTab(tabIndex)
    navigate(PRESCRIPTION_SEARCH_TABS[tabIndex].link)
  }

  // Default to prescription ID search if path not found
  const content = pathContent[pathname] || <PrescriptionIdSearch />

  return (
    <Fragment>
      <title>Search for a prescription</title>
      <main id="search-for-a-prescription" data-testid="search-for-a-prescription" style={{backgroundColor: "white"}}>
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
              <TabSet>
                {PRESCRIPTION_SEARCH_TABS.map((tab, index) => (
                  <TabSet.Tab
                    key={tab.link}
                    active={activeTab === index}
                    onClick={() => handleTabClick(index)}
                  >
                    {tab.title}
                  </TabSet.Tab>
                ))}
              </TabSet>
            </Col>
          </Row>
        </Container>
        <div style={{
          width: "100vw",
          marginLeft: "calc(-50vw + 50%)",
          borderBottom: "1px solid #d8dde0",
          height: "1px",
          backgroundColor: "white"
        }}></div>
        <div style={{
          width: "100vw",
          marginLeft: "calc(-50vw + 50%)",
          backgroundColor: "#F0F4F5",
          minHeight: "calc(100vh - 300px)"
        }}>
          <Container>
            <Row>
              <Col width="full">
                <div style={{padding: "2rem"}}>
                  {content}
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      </main>
    </Fragment>
  )
}
