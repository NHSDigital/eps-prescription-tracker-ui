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
import EpsSpinner from "@/components/EpsSpinner"
import {PRESCRIPTION_LIST_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionListPageStrings"
import {API_ENDPOINTS, FRONTEND_PATHS, NHS_REQUEST_URID} from "@/constants/environment"
import {PatientDetails} from "@cpt-ui-common/common-types"

import {usePatientDetails} from "@/context/PatientDetailsProvider"

export default function PrescriptionListPage() {
  // TODO: mock data - in the real implementation, this would come from props or context
  const prescriptionCount = 5
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
    prefix: "Mr",
    suffix: "",
    given: "William",
    family: "Wolderton",
    gender: null,
    dateOfBirth: null,
    address: null
  }

  const navigate = useNavigate()
  const auth = useContext(AuthContext)
  const {setPatientDetails} = usePatientDetails()
  const [queryParams] = useSearchParams()

  const [backLinkTarget, setBackLinkTarget] = useState<string>(PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runSearch = async () => {
      const hasPrescriptionId = !!queryParams.get("prescriptionId")
      const hasNhsNumber = !!queryParams.get("nhsNumber")

      // determine which search page to go back to based on query parameters
      if (hasPrescriptionId) {
        setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.PRESCRIPTION_ID_SEARCH_TARGET)
      } else if (hasNhsNumber) {
        setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.NHS_NUMBER_SEARCH_TARGET)
      } else {
        setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET)
        // if no search is given, navigate to the not found page
        navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
        return
      }

      if (hasPrescriptionId) {
        const prescId = queryParams.get("prescriptionId")!
        const searchResults = await searchPrescriptionID(prescId)
        console.log("Got search results", searchResults)
        if (!searchResults) {
          const notFoundUrl = `${FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND}?searchType=PrescriptionIdSearch`
          navigate(notFoundUrl)
        }
      }

      if (hasNhsNumber) {
        const nhsNumber = queryParams.get("nhsNumber")!
        // Assuming you’ll also refactor searchNhsNumber to be async
        const result = await searchNhsNumber(nhsNumber)
        if (!result) {
          const notFoundUrl = `${FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND}?searchType=NhsNumberSearch`
          navigate(notFoundUrl)
        }
      }
    }

    setLoading(true)
    runSearch()
  }, [queryParams])

  // TODO: This should return the search results. For now, just return true or false for mock stuff.
  const searchPrescriptionID = async (prescriptionId: string): Promise<boolean> => {
    console.log("Searching for prescription ID ", prescriptionId)

    // TODO: Validate ID (if invalid, navigate away)
    // if (!validatePrescriptionId(prescriptionId)) {
    //   navigate(notFoundUrl);
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

      if (response.status !== 200) {
      // Throwing an error here will jump to the catch block.
        throw new Error(`Status Code: ${response.status}`)
      }
      // TODO: populate mock data
      return true

    } catch (error) {
      console.error("Error retrieving prescription details:", error)
      // Allow known test ID through; otherwise, return false.
      if (prescriptionId === "C0C757-A83008-C2D93O") {
        console.log("Using mock data")
        setPatientDetails(mockPatient)
        return true
      }
      if (prescriptionId === "209E3D-A83008-327F9F") {
        console.log("Using mock data")
        setPatientDetails(minimumDetails)
        return true
      }
      return false

    } finally {
      setLoading(false)
    }
  }

  // TODO: This will need to be implemented later
  const searchNhsNumber = (nhsNumber: string): Promise<boolean> => {
    console.log("Searching for nhs number:", nhsNumber)
    setLoading(false)
    return Promise.resolve(true)
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
                <BackLink
                  data-testid="go-back-link"
                  asElement={Link}
                  to={backLinkTarget}
                >
                  {PRESCRIPTION_LIST_PAGE_STRINGS.GO_BACK_LINK_TEXT}
                </BackLink>
              </nav>
            </Col>
          </Row>
          <Row>
            <Col width="full">
              <h2 className="nhsuk-heading-l" data-testid="prescription-list-heading">
                {PRESCRIPTION_LIST_PAGE_STRINGS.HEADING}
              </h2>
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
            {/* Prescription list items would go here */}
          </div>
        </Container>
      </main>
    </>
  )
}
