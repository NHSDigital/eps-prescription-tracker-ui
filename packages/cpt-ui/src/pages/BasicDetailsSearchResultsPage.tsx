/* eslint-disable max-len */
import React, {useContext, useEffect, useState} from "react"
import {useNavigate, useSearchParams} from "react-router-dom"
import {
  BackLink,
  Table,
  Container,
  Row,
  Col
} from "nhsuk-react-components"
import {SearchResultsPageStrings} from "@/constants/ui-strings/BasicDetailsSearchResultsPageStrings"
import {API_ENDPOINTS, FRONTEND_PATHS, NHS_REQUEST_URID} from "@/constants/environment"
import {AuthContext} from "@/context/AuthProvider"
import {PatientSummary} from "@cpt-ui-common/common-types"
import http from "@/helpers/axios"
import EpsSpinner from "@/components/EpsSpinner"

// Mock patient data (fallback)
const mockPatients: Array<PatientSummary> = [
  {
    nhsNumber: "9726919207",
    givenName: ["Issac"],
    familyName: "Wolderton-Rodriguez",
    gender: "Male",
    dateOfBirth: "6-May-2013",
    address: ["123 Brundel Close", "Headingley", "Leeds", "West Yorkshire", "LS6 1JL"]
  },
  {
    nhsNumber: "9725919207",
    givenName: ["Steve"],
    familyName: "Wolderton-Rodriguez",
    gender: "Male",
    dateOfBirth: "6-May-2013",
    address: ["123 Brundel Close", "Headingley", "Leeds", "West Yorkshire", "LS6 1JL"]
  }
]

export default function SearchResultsPage() {
  const auth = useContext(AuthContext)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<Array<PatientSummary>>([])

  const getSearchResults = async () => {
    try {
      // Attempt to fetch live search results from the API
      const response = await http.get(API_ENDPOINTS.PATIENT_SEARCH, {
        headers: {
          Authorization: `Bearer ${auth?.idToken}`,
          "NHSD-Session-URID": NHS_REQUEST_URID
        },
        params: {
          family: searchParams.get("family"),
          birthdate: `eq${searchParams.get("dateOfBirth")}`,
          "address-postalcode": searchParams.get("postcode"),
          given: searchParams.get("given") ?? undefined
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

      setPatients(payload)
    } catch (err) {
      // TODO: Remove the fallback to mock data when the backend is working
      console.error("Failed to fetch patient search results. Using mock data fallback.", err)
      setPatients(mockPatients)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getSearchResults()
  }, [])

  const handleRowClick = (nhsNumber: string) => {
    navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?nhsNumber=${nhsNumber}`)
  }

  const handleGoBack = () => {
    navigate(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS, {state: {clear: true}})
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

  // to sort by first name
  const sortedPatients = patients
    .toSorted((a, b) => (a.givenName?.[0] ?? "").localeCompare(b.givenName?.[0] ?? ""))

  return (
    <main className="nhsuk-main-wrapper" id="main-content" role="main">
      <Container>
        <Row>
          <Col width="full">
            <BackLink onClick={handleGoBack}>{SearchResultsPageStrings.GO_BACK}</BackLink>
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
