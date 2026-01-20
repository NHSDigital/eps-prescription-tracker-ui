import React, {Fragment, useEffect, useState} from "react"
import {useNavigate, useLocation} from "react-router-dom"
import {
  Table,
  Container,
  Row,
  Col
} from "nhsuk-react-components"
import {SearchResultsPageStrings} from "@/constants/ui-strings/BasicDetailsSearchResultsPageStrings"
import {API_ENDPOINTS, FRONTEND_PATHS} from "@/constants/environment"
import {PatientSummary} from "@cpt-ui-common/common-types/src"
import http from "@/helpers/axios"
import {logger} from "@/helpers/logger"

import EpsSpinner from "@/components/EpsSpinner"
import {useSearchContext} from "@/context/SearchProvider"
import {useNavigationContext} from "@/context/NavigationProvider"
import EpsBackLink from "@/components/EpsBackLink"
import UnknownErrorMessage from "@/components/UnknownErrorMessage"
import {usePageTitle} from "@/hooks/usePageTitle"
import axios from "axios"
import {useAuth} from "@/context/AuthProvider"
import {handleRestartLogin} from "@/helpers/logout"

export default function SearchResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<Array<PatientSummary>>([])
  const searchContext = useSearchContext()
  const navigationContext = useNavigationContext()

  const [error, setError] = useState(false)

  const auth = useAuth()

  // different page titles depending on if theres multiple patients matching
  const pageTitle = patients.length > 0
    ? SearchResultsPageStrings.MULTIPLE_PATIENTS_FOUND.replace("{count}", patients.length.toString())
    : `${SearchResultsPageStrings.TITLE} - Prescription Tracker`
  usePageTitle(pageTitle)

  useEffect(() => {
    getSearchResults()
  }, [])

  const getSearchResults = async () => {
    try {
      // Attempt to fetch live search results from the API
      const response = await http.get(API_ENDPOINTS.PATIENT_SEARCH, {
        params: {
          familyName: searchContext.lastName,
          dateOfBirth: `${searchContext.dobYear}-${searchContext.dobMonth}-${searchContext.dobDay}`,
          postcode: searchContext.postcode,
          givenName: searchContext.firstName ?? undefined
        }
      })

      // Validate HTTP response status
      if (response.status !== 200) {
        throw new Error(`Status Code: ${response.status}`)
      }

      // Assign response payload or throw if none received
      const payload: Array<PatientSummary> = response.data
      if (!payload) {
        throw new Error("No payload received from the API")
      }

      if (payload.length === 1) {
        const relevantParams =
          navigationContext.getRelevantSearchParameters("basicDetails")
        searchContext.setAllSearchParameters({
          ...relevantParams,
          nhsNumber: payload[0].nhsNumber
        })
        navigate(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)
        return
      }

      setPatients(payload)
      setLoading(false)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        const invalidSessionCause = err.response?.data?.invalidSessionCause
        handleRestartLogin(auth, invalidSessionCause)
        return
      }
      logger.error("Error loading search results:", err)
      setLoading(false)
      setError(true)
    }
  }

  const handleRowClick = (nhsNumber: string) => {
    // only preserve relevant search parameters and add NHS number
    const relevantParams =
      navigationContext.getRelevantSearchParameters("basicDetails")
    searchContext.setAllSearchParameters({
      ...relevantParams,
      nhsNumber: nhsNumber
    })
    navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}`)
  }

  // Sort by first name
  const sortedPatients = patients
    .toSorted((a, b) => (a.givenName?.[0] ?? "").localeCompare(b.givenName?.[0] ?? ""))

  if (loading) {
    return (
      <main className="nhsuk-main-wrapper" id="main-content" role="main">
        <Container>
          <Row>
            <Col width="full">
              <h1 className="nhsuk-u-visually-hidden">{SearchResultsPageStrings.TITLE}</h1>
              <h2 data-testid="loading-message">{SearchResultsPageStrings.LOADING}</h2>
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

  // Show not found message if no valid patients
  if (patients.length === 0) {
    navigate(FRONTEND_PATHS.NO_PATIENT_FOUND)
    return null
  }

  // Show too many results message if search returns too many patients
  if (patients.length > 10) {
    navigate(FRONTEND_PATHS.TOO_MANY_SEARCH_RESULTS + location.search)
    return null
  }

  return (
    <Fragment>
      <Container className="hero-container">
        <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb" data-testid="prescription-list-nav"
        >
          <EpsBackLink>{SearchResultsPageStrings.GO_BACK}</EpsBackLink>
        </nav>
      </Container>
      <main id="main-content" role="main">
        <Container>
          <Row>
            <Col width="full"></Col>
          </Row>
          <Row>
            <Col width="full">
              <h1 className="nhsuk-u-margin-bottom-3 nhsuk-heading-m" id="results-header">
                {SearchResultsPageStrings.TITLE}
              </h1>
              <h2 className="nhsuk-heading-xs" id="results-count">
                {SearchResultsPageStrings.RESULTS_COUNT.replace("{count}", sortedPatients.length.toString())}
              </h2>
              <Table responsive id="results-table">
                <Table.Head>
                  <Table.Row>
                    <Table.Cell as="th" scope="col" id="header-name" width="25%">
                      {SearchResultsPageStrings.TABLE.NAME}
                    </Table.Cell>
                    <Table.Cell as="th" scope="col" id="header-gender" width="8.3%">
                      {SearchResultsPageStrings.TABLE.GENDER}
                    </Table.Cell>
                    <Table.Cell as="th" scope="col" id="header-dob" width="16.67%">
                      {SearchResultsPageStrings.TABLE.DOB}
                    </Table.Cell>
                    <Table.Cell as="th" scope="col" id="header-address" width="33%">
                      {SearchResultsPageStrings.TABLE.ADDRESS}
                    </Table.Cell>
                    <Table.Cell as="th" scope="col" id="header-nhs" width="16.67%">
                      {SearchResultsPageStrings.TABLE.NHS_NUMBER}
                    </Table.Cell>
                  </Table.Row>
                </Table.Head>
                <Table.Body className="patients">
                  {sortedPatients.map((patient) => (
                    <Table.Row
                      id={`patient-row-${patient.nhsNumber}`}
                      key={patient.nhsNumber}
                      onClick={() => handleRowClick(patient.nhsNumber)}
                      onKeyDown={e => (e.key === "Enter" || e.key === " ") && handleRowClick(patient.nhsNumber)}
                    >
                      <Table.Cell headers="header-name">
                        <a
                          href={`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?nhsNumber=${patient.nhsNumber}`}
                          onClick={(e) => {
                            e.preventDefault()
                            handleRowClick(patient.nhsNumber)
                          }}
                        >
                          {patient.givenName?.[0] ?? ""} {patient.familyName}
                          <span id={`patient-details-${patient.nhsNumber}`} className="nhsuk-u-visually-hidden">
                            {`NHS number ${patient.nhsNumber.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}`}
                          </span>
                        </a>
                      </Table.Cell>
                      <Table.Cell headers="header-gender">{patient.gender}</Table.Cell>
                      <Table.Cell headers="header-dob">{patient.dateOfBirth}</Table.Cell>
                      <Table.Cell headers="header-address">{patient.address?.join(", ")}</Table.Cell>
                      <Table.Cell headers="header-nhs">
                        {patient.nhsNumber.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Col>
          </Row>
        </Container>
      </main>
    </Fragment>
  )
}
