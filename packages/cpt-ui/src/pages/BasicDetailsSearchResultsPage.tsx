/* eslint-disable max-len */
import React from "react"
import {useNavigate} from "react-router-dom"
import {
  BackLink,
  Table,
  Container,
  Row,
  Col,
  Breadcrumb
} from "nhsuk-react-components"
import {SearchResultsPageStrings} from "@/constants/ui-strings/BasicDetailsSearchResultsPageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

// Mock patient data (from the prototype)
const patients = [
  {
    nhsNumber: "9726919207",
    given: "Issac",
    family: "Wolderton-Rodriguez",
    gender: "Male",
    dateOfBirth: "6-May-2013",
    address: "123 Brundel Close, Headingley, Leeds, West Yorkshire, LS6 1JL",
    restricted: false
  },
  {
    nhsNumber: "9725919207",
    given: "Steve",
    family: "Wolderton-Rodriguez",
    gender: "Male",
    dateOfBirth: "6-May-2013",
    address: "123 Brundel Close, Headingley, Leeds, West Yorkshire, LS6 1JL",
    restricted: false
  }
]

export default function SearchResultsPage() {
  const navigate = useNavigate()

  // Sort by first name
  const sortedPatients = patients
    .filter(p => !p.restricted)
    .sort((a, b) => a.given.localeCompare(b.given))

  const handleRowClick = (nhsNumber: string) => {
    navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?nhsNumber=${nhsNumber}`)
  }

  const handleGoBack = () => {
    navigate(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS, {state: {clear: true}})
  }

  return (
    <main className="nhsuk-main-wrapper nhsuk-main-wrapper--s" id="main-content" role="main">
      <Breadcrumb>
        <Col width="full">
          <BackLink onClick={handleGoBack}>{SearchResultsPageStrings.GO_BACK}</BackLink>
        </Col>
      </Breadcrumb>
      <Container>
        <Row>
          <Col width="full">
            <h1 className="nhsuk-u-margin-bottom-3 nhsuk-heading-m" id="results-header">
              {SearchResultsPageStrings.TITLE}
            </h1>
            <h2 className="nhsuk-heading-xs" id="results-count-text">
              {SearchResultsPageStrings.RESULTS_COUNT.replace("{count}", sortedPatients.length.toString())}
            </h2>
            <Table responsive>
              <Table.Head role="rowgroup">
                <Table.Row>
                  <Table.Cell as="th" scope="col" width="25%">{SearchResultsPageStrings.TABLE.NAME}</Table.Cell>
                  <Table.Cell as="th" scope="col" width="8.3%">{SearchResultsPageStrings.TABLE.GENDER}</Table.Cell>
                  <Table.Cell as="th" scope="col" width="16.67%">{SearchResultsPageStrings.TABLE.DOB}</Table.Cell>
                  <Table.Cell as="th" scope="col" width="33%">{SearchResultsPageStrings.TABLE.ADDRESS}</Table.Cell>
                  <Table.Cell as="th" scope="col" width="16.67%">{SearchResultsPageStrings.TABLE.NHS_NUMBER}</Table.Cell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {sortedPatients.map((patient) => (
                  <Table.Row
                    key={patient.nhsNumber}
                    tabIndex={0}
                    onClick={() => handleRowClick(patient.nhsNumber)}
                    onKeyDown={e => (e.key === "Enter" || e.key === " ") && handleRowClick(patient.nhsNumber)}
                    aria-label={SearchResultsPageStrings.ACCESSIBILITY.PATIENT_ROW.replace("{name}", `${patient.given} ${patient.family}`)}
                    role="button"
                  >
                    <Table.Cell>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          handleRowClick(patient.nhsNumber)
                        }}
                      >
                        {patient.given} {patient.family}
                      </a>
                    </Table.Cell>
                    <Table.Cell>{patient.gender}</Table.Cell>
                    <Table.Cell>{patient.dateOfBirth}</Table.Cell>
                    <Table.Cell>{patient.address}&nbsp;</Table.Cell>
                    <Table.Cell>
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
