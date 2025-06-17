/* eslint-disable max-len */
import React, {useEffect, useState} from "react"
import {useNavigate, useSearchParams, useLocation} from "react-router-dom"
import {
  BackLink,
  Table,
  Container,
  Row,
  Col
} from "nhsuk-react-components"
import {SearchResultsPageStrings} from "@/constants/ui-strings/BasicDetailsSearchResultsPageStrings"
import {API_ENDPOINTS, FRONTEND_PATHS} from "@/constants/environment"
import {PatientSummary} from "@cpt-ui-common/common-types/src"
import http from "@/helpers/axios"
import EpsSpinner from "@/components/EpsSpinner"
import PatientNotFoundMessage from "@/components/PatientNotFoundMessage"
import SearchResultsTooManyMessage from "@/components/SearchResultsTooManyMessage"
import UnknownErrorMessage from "@/components/UnknownErrorMessage"

export default function SearchResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [patients, setPatients] = useState<Array<PatientSummary>>([])

  useEffect(() => {
    getSearchResults()
  }, [])

  const getSearchResults = async () => {
    try{
    // Attempt to fetch live search results from the API
      const response = await http.get(API_ENDPOINTS.PATIENT_SEARCH, {
        params: {
          familyName: searchParams.get("lastName"),
          dateOfBirth: `${searchParams.get("dobYear")}-${searchParams.get("dobMonth")}-${searchParams.get("dobDay")}`,
          postcode: searchParams.get("postcode"),
          givenName: searchParams.get("firstName") ?? undefined
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
        const baseParams = {
          nhsNumber: payload[0].nhsNumber,
          ...Object.fromEntries(searchParams.entries())
        }
        const queryString = new URLSearchParams(baseParams).toString()
        navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?${queryString}`)
        return
      }

      setPatients(payload)
    } catch (err) {
      console.error("Unknown error while fetching search results:", err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (nhsNumber: string) => {
    const baseParams = {
      nhsNumber,
      ...Object.fromEntries(searchParams.entries())
    }
    const queryString = new URLSearchParams(baseParams).toString()
    navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?${queryString}`)
  }

  // Pass back the query string to keep filled form on return
  const handleGoBack = () => {
    navigate(`${FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS}${location.search}`)
  }

  // Sort by first name
  const sortedPatients = patients
    .toSorted((a, b) => (a.givenName?.[0] ?? "").localeCompare(b.givenName?.[0] ?? ""))

  if (error) {
    return <UnknownErrorMessage />
  }

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

  // Show not found message if no valid patients
  if (patients.length === 0) {
    return <PatientNotFoundMessage search={location.search} />
  }

  // Show too many results message if search returns too many patients
  if (patients.length > 10) {
    return <SearchResultsTooManyMessage search={location.search} />
  }

  return (
    <main className="nhsuk-main-wrapper" id="main-content" role="main">
      <Container>
        <Row>
          <Col width="full">
            <BackLink
              onClick={handleGoBack}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleGoBack()}
            >
              {SearchResultsPageStrings.GO_BACK}
            </BackLink>
          </Col>
        </Row>
        <Row>
          <Col width="full">
            <h1 className="nhsuk-u-margin-bottom-3 nhsuk-heading-m" id="results-header">
              {SearchResultsPageStrings.TITLE}
            </h1>
            <h2 className="nhsuk-heading-xs" id="results-count">
              {SearchResultsPageStrings.RESULTS_COUNT.replace("{count}", sortedPatients.length.toString())}
            </h2>
            <Table responsive id='results-table'>
              <Table.Head>
                <Table.Row>
                  <Table.Cell as="th" scope="col" id="header-name" width="25%">{SearchResultsPageStrings.TABLE.NAME}</Table.Cell>
                  <Table.Cell as="th" scope="col" id="header-gender" width="8.3%">{SearchResultsPageStrings.TABLE.GENDER}</Table.Cell>
                  <Table.Cell as="th" scope="col" id="header-dob" width="16.67%">{SearchResultsPageStrings.TABLE.DOB}</Table.Cell>
                  <Table.Cell as="th" scope="col" id="header-address" width="33%">{SearchResultsPageStrings.TABLE.ADDRESS}</Table.Cell>
                  <Table.Cell as="th" scope="col" id="header-nhs" width="16.67%">{SearchResultsPageStrings.TABLE.NHS_NUMBER}</Table.Cell>
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
                    <Table.Cell headers="header-address">{patient.address?.join(", ")}&nbsp;</Table.Cell>
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
  )
}
