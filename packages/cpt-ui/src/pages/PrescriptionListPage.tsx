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
} from "@cpt-ui-common/common-types"

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

  const getSearchDetails = () => {
    const prescriptionId = queryParams.get("prescriptionId")
    const nhsNumber = queryParams.get("nhsNumber")

    if (prescriptionId) {
      return {
        searchType: "prescriptionId",
        searchValue: prescriptionId,
        backLink: PRESCRIPTION_LIST_PAGE_STRINGS.PRESCRIPTION_ID_SEARCH_TARGET
      }
    } else if (nhsNumber) {
      return {
        searchType: "nhsNumber",
        searchValue: nhsNumber,
        backLink: PRESCRIPTION_LIST_PAGE_STRINGS.NHS_NUMBER_SEARCH_TARGET
      }
    }
    return {
      searchType: "",
      searchValue: "",
      backLink: PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET
    }
  }

  useEffect(() => {
    const runSearch = async () => {
      const {searchType, searchValue, backLink} = getSearchDetails()
      setBackLinkTarget(backLink)

      // If neither search parameter exists, we cant find anything"
      if (!searchType || !searchValue) {
        navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
        return
      }

      // These parameters will be passed to the not found page, if we need/want to
      const receivedSearchParams = `?searchType=${searchType}&${queryParams.toString()}`

      // Perform the appropriate search based on type.
      let searchResults: SearchResponse | undefined
      if (searchType === "prescriptionId") {
        searchResults = await searchPrescriptionID(searchValue)
      } else if (searchType === "nhsNumber") {
        searchResults = await searchNhsNumber(searchValue)
      }

      // If no results are returned, send the user to the not found page and preserve their query
      if (!searchResults) {
        console.error("No search results were returned", searchResults)
        navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND + receivedSearchParams)
        return
      }

      // we have results, so handle setting them
      const {currentPrescriptions, pastPrescriptions, futurePrescriptions, patient} = searchResults
      const totalPrescriptions =
        currentPrescriptions.length + pastPrescriptions.length + futurePrescriptions.length

      if (totalPrescriptions === 0) {
        console.error("A patient was returned, but they do not have any prescriptions.", searchResults)
        navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND + receivedSearchParams)
        return
      }

      // Update states
      setCurrentPrescriptions(currentPrescriptions)
      setFuturePrescriptions(futurePrescriptions)
      setPastPrescriptions(pastPrescriptions)
      setPatientDetails(patient)
      setPrescriptionCount(totalPrescriptions)

      setTabData([
        {
          link: PRESCRIPTION_LIST_TABS.current.link(queryParams.toString()),
          title: PRESCRIPTION_LIST_TABS.current.title(currentPrescriptions.length)
        },
        {
          link: PRESCRIPTION_LIST_TABS.future.link(queryParams.toString()),
          title: PRESCRIPTION_LIST_TABS.future.title(futurePrescriptions.length)
        },
        {
          link: PRESCRIPTION_LIST_TABS.past.link(queryParams.toString()),
          title: PRESCRIPTION_LIST_TABS.past.title(pastPrescriptions.length)
        }
      ])
    }

    setLoading(true)
    runSearch().finally(() => setLoading(false))
  }, [queryParams, navigate, setPatientDetails])

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
      if (prescriptionId === "C0C757-A83008-C2D93O") {
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
      </main>
    </>
  )
}
