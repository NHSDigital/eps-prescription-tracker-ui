import React, {
  Fragment,
  useState,
  useEffect,
  useRef
} from "react"
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
import {useSearchContext} from "@/context/SearchProvider"

export default function SearchPrescriptionPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const searchContext = useSearchContext()

  // Clear search context contamination when navigating to search pages
  useEffect(() => {
    if (!searchContext) return

    const allParams = searchContext.getAllSearchParameters()
    if (!allParams) return

    // Check if we have contamination from multiple search types
    const hasPrescriptionId = !!allParams.prescriptionId
    const hasNhsNumber = !!allParams.nhsNumber
    const hasBasicDetails = !!(allParams.firstName || allParams.lastName || allParams.dobDay)

    const contaminationCount = [hasPrescriptionId, hasNhsNumber, hasBasicDetails].filter(Boolean).length

    if (contaminationCount > 1) {
      searchContext.clearSearchParameters()
    }
  }, [pathname, searchContext])

  const [activeTab, setActiveTab] = useState(0)
  const [ariaLiveMessage, setAriaLiveMessage] = useState("")
  const activeTabRef = useRef(activeTab)

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
    activeTabRef.current = activeTab
  }, [activeTab])

  const handleKeyDown = (event: KeyboardEvent) => {
    const activeElement = document.activeElement as HTMLElement | null
    const isInputFocused = !!activeElement && (
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
      const currentIndex = activeTabRef.current
      const newIndex = currentIndex > 0 ? currentIndex - 1 : PRESCRIPTION_SEARCH_TABS.length - 1
      handleTabClick(newIndex, true)
      return
    }

    if (event.key === "ArrowRight") {
      event.preventDefault()
      const currentIndex = activeTabRef.current
      const newIndex = currentIndex < PRESCRIPTION_SEARCH_TABS.length - 1 ? currentIndex + 1 : 0
      handleTabClick(newIndex, true)
    }
  }

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const handleTabClick = (tabIndex: number, fromKeyboard: boolean = false) => {

    const hasInputText = checkForInputText(activeTab)

    setActiveTab(tabIndex)
    navigate(PRESCRIPTION_SEARCH_TABS[tabIndex].link)

    if (hasInputText && tabIndex !== activeTab) {
      const isFromBasicDetails = activeTab === 2
      const inputText = isFromBasicDetails ? "inputs" : "input"
      setAriaLiveMessage(`Switched to a new tab, cleared ${inputText} on the previous tab`)
      setTimeout(() => setAriaLiveMessage(""), 2000)
    }

    if (fromKeyboard) {
      setTimeout(() => {

        const tabButtons = document.querySelectorAll(".nhsuk-tab-set__tab")
        const targetTab = tabButtons[tabIndex] as HTMLButtonElement
        if (targetTab) {
          targetTab.focus()
        }
      }, 100)
    } else {
      // Handle focus management for regular clicks (non-keyboard)
      setTimeout(() => {
        let inputId: string | null = null

        switch (tabIndex) {
          case 0:
            inputId = "presc-id-input"
            break
          case 1:
            inputId = "nhs-number-input"
            break
          case 2: {
            const activeElement = document.activeElement as HTMLElement
            if (activeElement && activeElement.blur) {
              activeElement.blur()
            }
            break
          }
          default:
            break
        }

        if (inputId) {
          const inputElement = document.getElementById(inputId)
          if (inputElement) {
            (inputElement as HTMLInputElement).focus()
          }
        }
      }, 100)
    }
  }

  const checkForInputText = (currentTabIndex: number): boolean => {
    let inputSelector = ""
    const basicInputs = [
      "#first-name-input",
      "#last-name-input",
      "#dob-day-input",
      "#dob-month-input",
      "#dob-year-input",
      "#postcode-input"
    ]
    switch (currentTabIndex) {
      case 0:
        inputSelector = "#presc-id-input"
        break
      case 1:
        inputSelector = "#nhs-number-input"
        break
      case 2:
        return basicInputs.some(selector => {
          const input = document.querySelector(selector) as HTMLInputElement
          return input && input.value.trim() !== ""
        })
      default:
        return false
    }

    const input = document.querySelector(inputSelector) as HTMLInputElement
    return input && input.value.trim() !== ""
  }

  // Default to prescription ID search if path not found
  const content = pathContent[pathname] || <PrescriptionIdSearch />

  return (
    <Fragment>
      <title>{HERO_TEXT}</title>
      <main id="search-for-a-prescription"
        className="search-for-a-prescription" data-testid="search-for-a-prescription">
        <Hero className="nhsuk-hero-wrapper hero-full-width" data-testid="hero-banner">
          <Container>
            <Row>
              <Col width="full">
                <Hero.Heading className="heroHeading" id="hero-heading" data-testid="hero-heading">
                  {HERO_TEXT}
                </Hero.Heading>
              </Col>
            </Row>
          </Container>
        </Hero>
        <div className="tabs-full-width-container">
          <Container data-testid="search-tabs-container">
            <Row>
              <Col width="full">
                <TabSet>
                  {PRESCRIPTION_SEARCH_TABS.map((tab, index) => (
                    <TabSet.Tab
                      key={tab.link}
                      active={activeTab === index}
                      controls={`search-panel-${index}`}
                      onClick={() => handleTabClick(index)}
                    >
                      {tab.title}
                    </TabSet.Tab>
                  ))}
                </TabSet>
              </Col>
            </Row>
          </Container>
        </div>
        <div className="tab-divider"></div>
        <div className="content-wrapper">
          <Container>
            <Row>
              <Col width="full">
                <div
                  className="content-padding"
                  role="tabpanel"
                  id={`search-panel-${activeTab}`}
                  aria-labelledby={`tab-${activeTab}`}
                >
                  {content}
                </div>
              </Col>
            </Row>
          </Container>
        </div>
        {/* Aria-live region for announcing tab switch events */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {ariaLiveMessage}
        </div>
      </main>
    </Fragment>
  )
}
