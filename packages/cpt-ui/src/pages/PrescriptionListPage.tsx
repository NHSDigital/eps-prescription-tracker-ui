import React, {useContext, useEffect, useState} from "react"
import {Link, useNavigate, useSearchParams} from "react-router-dom"
import {
  BackLink,
  Col,
  Container,
  Row
} from "nhsuk-react-components"

import http from "@/helpers/axios"

import {AuthContext} from "@/context/AuthProvider"
import {usePatientDetails} from "@/context/PatientDetailsProvider"

import EpsSpinner from "@/components/EpsSpinner"
import PrescriptionsListTabs from "@/components/prescriptionList/PrescriptionsListTab"
import {TabHeader} from "@/components/EpsTabs"

import {PRESCRIPTION_LIST_TABS} from "@/constants/ui-strings/PrescriptionListTabStrings"
import {PRESCRIPTION_LIST_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionListPageStrings"
import {API_ENDPOINTS, FRONTEND_PATHS, NHS_REQUEST_URID} from "@/constants/environment"

import {
  PatientDetails,
  SearchResponse,
  TreatmentType,
  PrescriptionStatus,
  PrescriptionSummary
} from "@cpt-ui-common/common-types/src/prescriptionList"

export default function PrescriptionListPage() {
  // FIXME: mock data. DELETEME!
  const mockPatient: PatientDetails = {
    nhsNumber: "5900009890",
    prefix: "Mr",
    suffix: "",
    given: "William",
    family: "Wolderton",
    gender: "male",
    dateOfBirth: "01-Nov-1988",
    address: {
      line1: "55 OAK STREET",
      line2: "OAK LANE",
      city: "Leeds",
      postcode: "LS1 1XX"
    }
  }

  const minimumDetails: PatientDetails = {
    nhsNumber: "5900009890",
    prefix: "Ms",
    suffix: "",
    given: "Janet",
    family: "Piper",
    gender: null,
    dateOfBirth: null,
    address: null
  }

  const mockSearchResponse: SearchResponse = {
    patient: mockPatient,
    currentPrescriptions: [
      {
        prescriptionId: "RX001",
        statusCode: PrescriptionStatus.TO_BE_DISPENSED,
        issueDate: "2025-03-01",
        prescriptionTreatmentType: TreatmentType.REPEAT,
        issueNumber: 1,
        maxRepeats: 5,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: false
      },
      {
        prescriptionId: "RX002",
        statusCode: PrescriptionStatus.WITH_DISPENSER,
        issueDate: "2025-02-15",
        prescriptionTreatmentType: TreatmentType.ACUTE,
        issueNumber: 2,
        maxRepeats: 3,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: false
      },
      {
        prescriptionId: "RX003",
        statusCode: PrescriptionStatus.WITH_DISPENSER_ACTIVE,
        issueDate: "2025-03-10",
        prescriptionTreatmentType: TreatmentType.ERD,
        issueNumber: 3,
        maxRepeats: 4,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: true
      }
    ],
    pastPrescriptions: [
      {
        prescriptionId: "RX004",
        statusCode: PrescriptionStatus.DISPENSED,
        issueDate: "2025-01-15",
        prescriptionTreatmentType: TreatmentType.REPEAT,
        issueNumber: 1,
        maxRepeats: 2,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: false
      },
      {
        prescriptionId: "RX005",
        statusCode: PrescriptionStatus.NOT_DISPENSED,
        issueDate: "2024-12-20",
        prescriptionTreatmentType: TreatmentType.ACUTE,
        issueNumber: 1,
        maxRepeats: 1,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: false
      }
    ],
    futurePrescriptions: [
      {
        prescriptionId: "RX006",
        statusCode: PrescriptionStatus.FUTURE_DATED_PRESCRIPTION,
        issueDate: "2025-04-01",
        prescriptionTreatmentType: TreatmentType.REPEAT,
        issueNumber: 1,
        maxRepeats: 10,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: false
      }
    ]
  }

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
      const hasPrescriptionId = !!queryParams.get("prescriptionId")
      const hasNhsNumber = !!queryParams.get("nhsNumber")

      // Local version to prevent a race condition
      let newBackLinkTarget = backLinkTarget

      // determine which search page to go back to based on query parameters
      if (hasPrescriptionId) {
        newBackLinkTarget = PRESCRIPTION_LIST_PAGE_STRINGS.PRESCRIPTION_ID_SEARCH_TARGET
        setBackLinkTarget(newBackLinkTarget)
      } else if (hasNhsNumber) {
        newBackLinkTarget = PRESCRIPTION_LIST_PAGE_STRINGS.NHS_NUMBER_SEARCH_TARGET
        setBackLinkTarget(newBackLinkTarget)
      }

      let searchResults: SearchResponse | undefined
      let searchValue: string = ""

      if (hasPrescriptionId) {
        searchValue = queryParams.get("prescriptionId")!
        searchResults = await searchPrescriptionID(searchValue)
      }

      if (hasNhsNumber) {
        searchValue = queryParams.get("nhsNumber")!
        // Assuming you’ll also refactor searchNhsNumber to be async
        searchResults = await searchNhsNumber(searchValue)
      }

      if (!searchResults) {
        console.error("No search results were returned", searchResults)
        navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
        return
      }

      if (
        searchResults.currentPrescriptions.length === 0
        && searchResults.pastPrescriptions.length === 0
        && searchResults.futurePrescriptions.length === 0
      ) {
        console.error("A patient was returned, but they do not have any prescriptions.", searchResults)
        navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
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
    runSearch().finally(() => setLoading(false))
  }, [queryParams])

  // TODO: This should return the search results. For now, just return true or false for mock stuff.
  const searchPrescriptionID = async (prescriptionId: string): Promise<SearchResponse | undefined> => {
    console.log("Searching for prescription ID ", prescriptionId)

    // TODO: Validate ID (if invalid, navigate away)
    // if (!validatePrescriptionId(prescriptionId)) {
    //   navigate(backLinkTarget);
    //   return;
    // }

    const url = `${API_ENDPOINTS.PRESCRIPTION_DETAILS}/${prescriptionId}`

    try {
      const response = await http.get(url, {
        headers: {
          Authorization: `Bearer ${auth?.idToken}`,
          "NHSD-Session-URID": NHS_REQUEST_URID
        }
      })

      console.log("Response status", {status: response.status})
      if (response.status !== 200) {
        // Throwing an error here will jump to the catch block.
        throw new Error(`Status Code: ${response.status}`)
      }

      const payload: SearchResponse = response.data
      return payload

    } catch (error) {
      // FIXME remove references to mock data
      console.error("Error retrieving prescription details:", error)
      // Allow known test ID through; otherwise, return false.
      const fullPrescriptionIds = [
        "C0C757-A83008-C2D93O",
        "7F1A4B-A83008-91DC2E",
        "B8C9E2-A83008-5F7B3A",
        "4D6F2C-A83008-A3E7D1"
      ]
      if (fullPrescriptionIds.includes(prescriptionId)) {
        console.log("Using mock data")
        const response = {
          ...mockSearchResponse,
          patient: mockPatient
        }
        return response
      }
      if (prescriptionId === "209E3D-A83008-327F9F") {
        console.log("Using mock data")
        const response = {
          ...mockSearchResponse,
          patient: minimumDetails
        }
        // Remove future prescriptions
        response.futurePrescriptions = []
        response.pastPrescriptions = []
        return response
      }
    }
  }

  // TODO: This will need to be implemented later
  const searchNhsNumber = async (nhsNumber: string): Promise<SearchResponse | undefined> => {
    console.log("Searching for nhs number:", nhsNumber)

    const url = `${API_ENDPOINTS.PRESCRIPTION_DETAILS}/${nhsNumber}`

    try {
      const response = await http.get(url, {
        headers: {
          Authorization: `Bearer ${auth?.idToken}`,
          "NHSD-Session-URID": NHS_REQUEST_URID
        }
      })

      console.log("Response status", {status: response.status})
      if (response.status !== 200) {
        // Throwing an error here will jump to the catch block.
        throw new Error(`Status Code: ${response.status}`)
      }

      const payload: SearchResponse = response.data
      return payload

    } catch (error) {
      if (nhsNumber === "1234567890") {
        console.error("Failed to fetch. Returning mock data", error)
        return Promise.resolve(mockSearchResponse)
      }
      console.error("Failed to fetch prescription search.", error)
    }
  }

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
                <Link to={backLinkTarget} data-testid="back-link-container">
                  <BackLink data-testid="go-back-link">{PRESCRIPTION_LIST_PAGE_STRINGS.GO_BACK_LINK_TEXT}</BackLink>
                </Link>
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

        {/* FIXME: DELETE THIS WHEN WE HAVE ANOTHER WAY TO NAVIGATE TO PRESCRIPTION DETAILS! */}
        {!!queryParams.get("prescriptionId") &&
          <Container>
            <Row>
              <Col width="full" style={{margin: 20}}>
                <Link
                  to={`${FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE}?prescriptionId=${queryParams.get("prescriptionId")}`}
                  data-testid="prescription-details-link-container"
                >
                  [DEV] Go to corresponding prescription details page
                </Link>
              </Col>
            </Row>
          </Container>
        }
      </main>
    </>
  )
}
