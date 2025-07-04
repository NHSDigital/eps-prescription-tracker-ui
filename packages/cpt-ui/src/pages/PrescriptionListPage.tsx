import React, {useEffect, useState} from "react"
import {Link, useNavigate} from "react-router-dom"
import {
  BackLink,
  Col,
  Container,
  Row
} from "nhsuk-react-components"
import "../styles/PrescriptionTable.scss"

import axios from "axios"

import {usePatientDetails} from "@/context/PatientDetailsProvider"

import EpsSpinner from "@/components/EpsSpinner"
import PrescriptionsListTabs from "@/components/prescriptionList/PrescriptionsListTab"
import {TabHeader} from "@/components/EpsTabs"
import PrescriptionNotFoundMessage from "@/components/PrescriptionNotFoundMessage"
import UnknownErrorMessage from "@/components/UnknownErrorMessage"

import {PRESCRIPTION_LIST_TABS} from "@/constants/ui-strings/PrescriptionListTabStrings"
import {PRESCRIPTION_LIST_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionListPageStrings"
import {API_ENDPOINTS, FRONTEND_PATHS} from "@/constants/environment"

import {SearchResponse, PrescriptionSummary} from "@cpt-ui-common/common-types/src/prescriptionList"

import http from "@/helpers/axios"
import {logger} from "@/helpers/logger"
import {useSearchContext} from "@/context/SearchProvider"
import {buildBackLink, determineSearchType} from "@/helpers/prescriptionNotFoundLinks"

export default function PrescriptionListPage() {
  const {setPatientDetails} = usePatientDetails()
  const searchContext = useSearchContext()

  const navigate = useNavigate()
  const [futurePrescriptions, setFuturePrescriptions] = useState<Array<PrescriptionSummary>>([])
  const [pastPrescriptions, setPastPrescriptions] = useState<Array<PrescriptionSummary>>([])
  const [currentPrescriptions, setCurrentPrescriptions] = useState<Array<PrescriptionSummary>>([])
  const [prescriptionCount, setPrescriptionCount] = useState(0)
  const [tabData, setTabData] = useState<Array<TabHeader>>([])
  const [loading, setLoading] = useState(true)
  const [showNotFound, setShowNotFound] = useState(false)
  const [error, setError] = useState(false)

  const searchType = determineSearchType(searchContext)
  const backLinkUrl = buildBackLink(searchType, searchContext)

  useEffect(() => {
    const runSearch = async () => {
      setLoading(true)
      setShowNotFound(false) // Reset when search changes

      const searchParams = new URLSearchParams()

      // determine which search page to go back to based on query parameters
      if (searchContext.prescriptionId) {
        searchParams.append("prescriptionId", encodeURIComponent(searchContext.prescriptionId))
      } else if (searchContext.nhsNumber) {
        searchParams.append("nhsNumber", encodeURIComponent(searchContext.nhsNumber))
      } else {
        logger.error("No query parameter provided.")
        setLoading(false)
        return
      }

      try {
        const response = await http.get(API_ENDPOINTS.PRESCRIPTION_LIST, {
          params: searchParams
        })

        logger.info("Response status", {status: response.status})
        if (response.status === 404) {
          logger.error("No search results were returned")
          setShowNotFound(true)
          setLoading(false)
          return
        } else if (response.status !== 200) {
          throw new Error(`Status Code: ${response.status}`)
        }

        const searchResults: SearchResponse = response.data

        if (
          searchResults.currentPrescriptions.length === 0 &&
          searchResults.pastPrescriptions.length === 0 &&
          searchResults.futurePrescriptions.length === 0
        ) {
          logger.error("A patient was returned, but they do not have any prescriptions.", searchResults)
          setPatientDetails(searchResults.patient)
          setShowNotFound(true)
          setLoading(false)
          return
        }

        setCurrentPrescriptions(searchResults.currentPrescriptions)
        setFuturePrescriptions(searchResults.futurePrescriptions)
        setPastPrescriptions(searchResults.pastPrescriptions)
        setPatientDetails(searchResults.patient)
        setPrescriptionCount(
          searchResults.pastPrescriptions.length +
          searchResults.futurePrescriptions.length +
          searchResults.currentPrescriptions.length
        )
        setTabData([
          {
            link: PRESCRIPTION_LIST_TABS.current.link(),
            title: PRESCRIPTION_LIST_TABS.current.title(searchResults.currentPrescriptions.length)
          },
          {
            link: PRESCRIPTION_LIST_TABS.future.link(),
            title: PRESCRIPTION_LIST_TABS.future.title(searchResults.futurePrescriptions.length)
          },
          {
            link: PRESCRIPTION_LIST_TABS.past.link(),
            title: PRESCRIPTION_LIST_TABS.past.title(searchResults.pastPrescriptions.length)
          }
        ])
        setLoading(false)
      } catch (err) {
        logger.error("Error during search", err)
        if (axios.isAxiosError(err)) {
          if ((err.response?.status === 401) && err.response.data?.restartLogin) {
            navigate(FRONTEND_PATHS.LOGIN)
            return
          } else if (err.response?.status === 404) {
            setShowNotFound(true)
          } else {
            setError(true)
          }
        } else if (err instanceof Error && err.message === "canceled") {
          navigate(FRONTEND_PATHS.LOGIN)
          return
        } else {
          setError(true)
        }
        setLoading(false)
      }
    }

    runSearch()
  }, [])

  if (loading) {
    return (
      <main id="main-content" className="nhsuk-main-wrapper">
        <Container>
          <Row>
            <Col width="full">
              <h1 className="nhsuk-u-visually-hidden">
                {PRESCRIPTION_LIST_PAGE_STRINGS.HEADING}
              </h1>
              <h2 data-testid="loading-message">
                {PRESCRIPTION_LIST_PAGE_STRINGS.LOADING_MESSAGE}
              </h2>
              <EpsSpinner />
            </Col>
          </Row>
        </Container>
      </main>
    )
  }

  if (error) {
    return <UnknownErrorMessage />
  }

  // Show PrescriptionNotFoundMessage if no prescriptions found
  if (showNotFound) {
    return <PrescriptionNotFoundMessage />
  }

  return (
    <>
      <title>{PRESCRIPTION_LIST_PAGE_STRINGS.PAGE_TITLE}</title>
      <main id="prescription-list" data-testid="prescription-list-page">
        <Container className="hero-container" data-testid="prescription-list-hero-container">
          <Row>
            <Col width="full">
              <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb" data-testid="prescription-list-nav">
                <BackLink
                  data-testid="go-back-link"
                  asElement={Link}
                  to={backLinkUrl}
                >
                  {PRESCRIPTION_LIST_PAGE_STRINGS.GO_BACK_LINK_TEXT}
                </BackLink>
              </nav>
            </Col>
          </Row>
          <Row>
            <Col width="full">
              <h1 className="nhsuk-heading-l" data-testid="prescription-list-heading">
                {PRESCRIPTION_LIST_PAGE_STRINGS.HEADING}
              </h1>
            </Col>
          </Row>
        </Container>
        <Container className="results-container" data-testid="prescription-results-container">
          <p data-testid="results-heading">
            <strong data-testid="results-count">
              {PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_PREFIX}
              {prescriptionCount}
              {PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_SUFFIX}
            </strong>
          </p>
          <div data-testid="prescription-results-list">
            <PrescriptionsListTabs
              tabData={tabData}
              currentPrescriptions={currentPrescriptions}
              pastPrescriptions={pastPrescriptions}
              futurePrescriptions={futurePrescriptions}
            />
          </div>
        </Container>
      </main>
    </>
  )
}
