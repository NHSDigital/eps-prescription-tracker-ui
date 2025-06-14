import React, {useContext, useEffect, useState} from "react"
import {useNavigate, useSearchParams} from "react-router-dom"
import {
  BackLink,
  Col,
  Container,
  Row
} from "nhsuk-react-components"
import "../styles/PrescriptionTable.scss"

import http from "@/helpers/axios"

import {AuthContext} from "@/context/AuthProvider"
import {usePatientDetails} from "@/context/PatientDetailsProvider"
import EpsSpinner from "@/components/EpsSpinner"
import PrescriptionsListTabs from "@/components/prescriptionList/PrescriptionsListTab"
import {TabHeader} from "@/components/EpsTabs"

import {PRESCRIPTION_LIST_TABS} from "@/constants/ui-strings/PrescriptionListTabStrings"
import {PRESCRIPTION_LIST_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionListPageStrings"
import {API_ENDPOINTS, FRONTEND_PATHS} from "@/constants/environment"

import {SearchResponse, PrescriptionSummary} from "@cpt-ui-common/common-types/src/prescriptionList"

export default function PrescriptionListPage() {
  const auth = useContext(AuthContext)
  const {setPatientDetails} = usePatientDetails()

  const navigate = useNavigate()
  const [queryParams] = useSearchParams()
  const [futurePrescriptions, setFuturePrescriptions] = useState<Array<PrescriptionSummary>>([])
  const [pastPrescriptions, setPastPrescriptions] = useState<Array<PrescriptionSummary>>([])
  const [currentPrescriptions, setCurrentPrescriptions] = useState<Array<PrescriptionSummary>>([])
  const [prescriptionCount, setPrescriptionCount] = useState(0)
  const [tabData, setTabData] = useState<Array<TabHeader>>([])
  const [backLinkTarget, setBackLinkTarget] = useState<string>(PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runSearch = async () => {
      if (!auth?.isSignedIn) {
        console.log("Not signed in, waiting...")
        return
      }

      const prescriptionId = queryParams.get("prescriptionId")
      const nhsNumber = queryParams.get("nhsNumber")

      let searchParams = {}

      // determine which search page to go back to based on query parameters
      if (prescriptionId) {
        setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.PRESCRIPTION_ID_SEARCH_TARGET)
        searchParams = {prescriptionId}
      } else if (nhsNumber) {
        setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.NHS_NUMBER_SEARCH_TARGET)
        searchParams = {nhsNumber}
      } else {
        console.error("No query parameter provided.")
        navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
        return
      }

      const response = await http.get(API_ENDPOINTS.PRESCRIPTION_LIST, {
        params: searchParams
      })

      if (response.status === 404) {
        console.error("No search results were returned")
        navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
        return
      } else if (response.status !== 200) {
        throw new Error(`Status Code: ${response.status}`)
      }

      let searchResults: SearchResponse = response.data

      if (
        searchResults.currentPrescriptions.length === 0
        && searchResults.pastPrescriptions.length === 0
        && searchResults.futurePrescriptions.length === 0
      ) {
        console.error("A patient was returned, but they do not have any prescriptions.", searchResults)
        navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
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
          link: PRESCRIPTION_LIST_TABS.current.link(queryParams.toString()),
          title: PRESCRIPTION_LIST_TABS.current.title(searchResults.currentPrescriptions.length)
        },
        {
          link: PRESCRIPTION_LIST_TABS.future.link(queryParams.toString()),
          title: PRESCRIPTION_LIST_TABS.future.title(searchResults.futurePrescriptions.length)
        },
        {
          link: PRESCRIPTION_LIST_TABS.past.link(queryParams.toString()),
          title: PRESCRIPTION_LIST_TABS.past.title(searchResults.pastPrescriptions.length)
        }
      ])
    }

    setLoading(true)
    runSearch()
      .catch((err) => {
        console.error("Error during search", err)
        if (err.message === "CanceledError: canceled") {
          navigate(FRONTEND_PATHS.LOGIN)
        } else {
          navigate(backLinkTarget)
        }
      })
      .finally(() => setLoading(false))
  }, [queryParams, auth?.isSignedIn])

  if (loading) {
    return (
      <main id="main-content" className="nhsuk-main-wrapper">
        <Container>
          <Row>
            <Col width="full">
              <EpsSpinner />
            </Col>
          </Row>
        </Container>
      </main>
    )
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
                  href={backLinkTarget}
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault()
                    navigate(backLinkTarget)
                  }}
                >  {PRESCRIPTION_LIST_PAGE_STRINGS.GO_BACK_LINK_TEXT}
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
