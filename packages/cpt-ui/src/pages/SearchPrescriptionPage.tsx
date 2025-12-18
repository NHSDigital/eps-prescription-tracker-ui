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
import "@/styles/searchforaprescription.scss"

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys when not focused on an input element
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.tagName === "SELECT" ||
        activeElement.hasAttribute("contenteditable")
      )

      if (isInputFocused) {
        return
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        const newIndex = activeTab > 0 ? activeTab - 1 : PRESCRIPTION_SEARCH_TABS.length - 1
        handleTabClick(newIndex, true) // true indicates keyboard navigation
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        const newIndex = activeTab < PRESCRIPTION_SEARCH_TABS.length - 1 ? activeTab + 1 : 0
        handleTabClick(newIndex, true) // true indicates keyboard navigation
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [activeTab])

  const handleTabClick = (tabIndex: number, fromKeyboard: boolean = false) => {
    setActiveTab(tabIndex)
    navigate(PRESCRIPTION_SEARCH_TABS[tabIndex].link)

    // Focus the tab button when navigating via keyboard
    if (fromKeyboard) {
      setTimeout(() => {
        const tabButton = document.querySelector(`.nhsuk-tab-set__tab:nth-child(${tabIndex + 1})`) as HTMLButtonElement
        if (tabButton) {
          tabButton.focus()
        }
      }, 100)
    }
  }

  // Default to prescription ID search if path not found
  const content = pathContent[pathname] || <PrescriptionIdSearch />

  return (
    <Fragment>
      <title>{HERO_TEXT}</title>
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
        <div className="tab-divider"></div>
        <div className="content-wrapper">
          <Container>
            <Row>
              <Col width="full">
                <div className="content-padding">
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
