/* eslint-disable max-len */
import React from "react"
import {useNavigate} from "react-router-dom"
import {
  BackLink,
  Table,
  Col,
  Container,
  Row
} from "nhsuk-react-components"
import {SearchResultsPageStrings} from "../constants/ui-strings/SearchResultsPageStrings"

// Mock patient data (replace with real data source as needed)
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
    .filter(p => !p.restricted) // ready for future restricted field
    .sort((a, b) => a.given.localeCompare(b.given))

  const handleRowClick = (nhsNumber: string) => {
    navigate(`/prescription-list?nhsNumber=${nhsNumber}`)
  }

  const handleGoBack = () => {
    navigate("/search-by-basic-details", {state: {clear: true}})
  }

  return (
    <Container>
      <Row>
        <Col width="full">
          <BackLink onClick={handleGoBack}>{SearchResultsPageStrings.GO_BACK}</BackLink>
        </Col>
      </Row>
      <Row>
        <Col width="full">
          <div className="nhsuk-width-container-fluid query-results-container nhsuk-u-margin-left-2 nhsuk-u-margin-right-2">
            <div className="row">
              <div id="query-summary">
                <div className="query-results-header">
                  <h1
                    className="nhsuk-u-margin-bottom-3 nhsuk-heading-m"
                    id="results-header"
                  >
                    {SearchResultsPageStrings.TITLE}
                  </h1>
                  <h2 className="nhsuk-heading-xs" id="results-count-text">
                    <b>{SearchResultsPageStrings.RESULTS_COUNT.replace("{count}", sortedPatients.length.toString())}</b>
                  </h2>
                </div>
              </div>
            </div>
            <div
              id="patientview-sentinel"
              style={{height: 1, backgroundColor: "transparent"}}
            ></div>
            <Table caption="Patient search results" responsive>
              <Table.Head>
                <Table.Row>
                  <Table.Cell as="th" scope="col">{SearchResultsPageStrings.TABLE.NAME}</Table.Cell>
                  <Table.Cell as="th" scope="col">{SearchResultsPageStrings.TABLE.GENDER}</Table.Cell>
                  <Table.Cell as="th" scope="col">{SearchResultsPageStrings.TABLE.DOB}</Table.Cell>
                  <Table.Cell as="th" scope="col">{SearchResultsPageStrings.TABLE.ADDRESS}</Table.Cell>
                  <Table.Cell as="th" scope="col">{SearchResultsPageStrings.TABLE.NHS_NUMBER}</Table.Cell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {sortedPatients.map((patient) => (
                  <Table.Row
                    key={patient.nhsNumber}
                    tabIndex={0}
                    className="query-results-table__data-row"
                    onClick={() => handleRowClick(patient.nhsNumber)}
                    onKeyDown={e =>
                      (e.key === "Enter" || e.key === " ") && handleRowClick(patient.nhsNumber)
                    }
                    aria-label={SearchResultsPageStrings.ACCESSIBILITY.PATIENT_ROW.replace("{name}", `${patient.given} ${patient.family}`)}
                    role="row"
                  >
                    <Table.Cell>
                      <span className="query-results-table__data-row-name">
                        {patient.given} {patient.family}
                      </span>
                    </Table.Cell>
                    <Table.Cell>{patient.gender}</Table.Cell>
                    <Table.Cell>{patient.dateOfBirth}</Table.Cell>
                    <Table.Cell>{patient.address}</Table.Cell>
                    <Table.Cell>
                      {patient.nhsNumber.replace(
                        /(\d{3})(\d{3})(\d{4})/,
                        "$1 $2 $3"
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        </Col>
      </Row>
    </Container>
  )
}
