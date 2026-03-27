import React, {Fragment, useEffect, useState} from "react"
import {useNavigate} from "react-router-dom"
import {Col, Container, Row} from "nhsuk-react-components"
import "../styles/PrescriptionTable.scss"

import axios from "axios"

import {usePatientDetails} from "@/context/PatientDetailsProvider"

import EpsSpinner from "@/components/EpsSpinner"
import PrescriptionsListTabs from "@/components/prescriptionList/PrescriptionsListTab"
import {TabHeader} from "@/components/EpsTabs"
import UnknownErrorMessage from "@/components/UnknownErrorMessage"
import EpsBackLink from "@/components/EpsBackLink"

import {PRESCRIPTION_LIST_TABS} from "@/constants/ui-strings/PrescriptionListTabStrings"
import {PRESCRIPTION_LIST_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionListPageStrings"
import {API_ENDPOINTS, FRONTEND_PATHS} from "@/constants/environment"

import {SearchResponse, PrescriptionSummary} from "@cpt-ui-common/common-types/src/prescriptionList"

import http from "@/helpers/axios"
import {logger} from "@/helpers/logger"
import {useSearchContext} from "@/context/SearchProvider"
import {useNavigationContext} from "@/context/NavigationProvider"
import {handleRestartLogin, signOut} from "@/helpers/logout"
import {useAuth} from "@/context/AuthProvider"
import {AUTH_CONFIG} from "@/constants/environment"
import {usePageTitle} from "@/hooks/usePageTitle"

export default function PrescriptionListPage() {
  const {setPatientDetails, setPatientFallback} = usePatientDetails()
  const searchContext = useSearchContext()
  const navigationContext = useNavigationContext()

  const [futurePrescriptions, setFuturePrescriptions] = useState<Array<PrescriptionSummary>>([])
  const [pastPrescriptions, setPastPrescriptions] = useState<Array<PrescriptionSummary>>([])
  const [currentPrescriptions, setCurrentPrescriptions] = useState<Array<PrescriptionSummary>>([])
  const [prescriptionCount, setPrescriptionCount] = useState(0)
  const [tabData, setTabData] = useState<Array<TabHeader>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  usePageTitle(PRESCRIPTION_LIST_PAGE_STRINGS.pageTitle)

  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const runSearch = async () => {
      setLoading(true)

      // Use searchType from SearchProvider to determine which parameter to search with
      const searchParams = new URLSearchParams()
      // Check original parameters first, then fall back to current search context
      const originalSearchParams = navigationContext.getOriginalSearchParameters()

      // Handle basic details case - redirect only if we still have no NHS number or prescription ID
      const hasAnyNhsNumber = Boolean(originalSearchParams?.nhsNumber || searchContext.nhsNumber)
      const hasAnyPrescriptionId = Boolean(originalSearchParams?.prescriptionId || searchContext.prescriptionId)
      if (originalSearchParams &&
          (originalSearchParams.firstName || originalSearchParams.lastName) &&
          !hasAnyNhsNumber &&
          !hasAnyPrescriptionId) {
        logger.info("Basic details present but no NHS number/ prescription ID - redirecting to prescription ID search")
        navigate(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
        return
      }

      const handleSearchParams = (searchType: "nhsNumber" | "prescriptionId") => {
        const searchParam = originalSearchParams?.[searchType] || searchContext[searchType]
        if (!searchParam) {
          // No search parameter available - redirect to search page
          logger.info("No search parameter provided - redirecting to prescription ID search")
          navigate(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
          return
        }
        searchParams.append(searchType, searchParam)
      }

      switch (searchContext.searchType) {
        case "nhs":
          handleSearchParams("nhsNumber")
          break
        case "prescriptionId":
          handleSearchParams("prescriptionId")
          break
        case "basicDetails":
          handleSearchParams("nhsNumber")
          break
        default:
          // Unrecognized search type - redirect to search page
          logger.info("No search parameter provided - redirecting to prescription ID search")
          navigate(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
          return
      }

      try {
        const response = await http.get(API_ENDPOINTS.PRESCRIPTION_LIST, {
          params: searchParams
        })

        logger.info("Response status", {status: response.status})
        if (response.status === 404) {
          logger.warn("No search results were returned")
          navigate(FRONTEND_PATHS.NO_PRESCRIPTIONS_FOUND)
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
          logger.info(
            "A patient was returned, but they do not have any prescriptions."
          )
          setPatientDetails(searchResults.patient)
          setPatientFallback(searchResults.patientFallback)
          navigate(FRONTEND_PATHS.NO_PRESCRIPTIONS_FOUND)
          return
        }

        setCurrentPrescriptions(searchResults.currentPrescriptions)
        setFuturePrescriptions(searchResults.futurePrescriptions)
        setPastPrescriptions(searchResults.pastPrescriptions)
        setPatientDetails(searchResults.patient)
        setPatientFallback(searchResults.patientFallback)
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
        if (axios.isAxiosError(err)) {
          if ((err.response?.status === 401) && err.response.data?.restartLogin) {
            const invalidSessionCause = err.response?.data?.invalidSessionCause
            logger.warn("prescriptionList triggered restart login due to:", invalidSessionCause)
            handleRestartLogin(auth, invalidSessionCause)
            return
          } else if (err.response?.status === 404) {
            logger.warn("No search results were returned", err)
            navigate(FRONTEND_PATHS.NO_PRESCRIPTIONS_FOUND)
            return
          } else {
            setError(true)
            logger.error("Error during search", err)
          }
        } else if (err instanceof Error && err.message === "canceled") {
          logger.warn("Signing out due to request cancellation")
          signOut(auth, AUTH_CONFIG.REDIRECT_SIGN_OUT)
          return
        } else {
          setError(true)
          logger.error("Error during search", err)
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

  return (
    <Fragment>
      <Container className="hero-container">
        <title>{PRESCRIPTION_LIST_PAGE_STRINGS.pageTitle}</title>
        <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb" data-testid="prescription-list-nav">
          <EpsBackLink data-testid="go-back-link">
            {PRESCRIPTION_LIST_PAGE_STRINGS.GO_BACK_LINK_TEXT}
          </EpsBackLink>
        </nav>
      </Container>
      <main id="prescription-list" data-testid="prescription-list-page">
        <Container className="hero-container" data-testid="prescription-list-hero-container">
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
    </Fragment>
  )
}
