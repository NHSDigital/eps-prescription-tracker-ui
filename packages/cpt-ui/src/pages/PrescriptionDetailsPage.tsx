import {useEffect, useState} from "react"
import {useNavigate} from "react-router-dom"

import {Col, Container, Row} from "nhsuk-react-components"

import {
  OrgSummary,
  PrescriptionDetailsResponse,
  ItemDetails,
  MessageHistory
} from "@cpt-ui-common/common-types"

import {usePrescriptionInformation} from "@/context/PrescriptionInformationProvider"
import {usePatientDetails} from "@/context/PatientDetailsProvider"

import {API_ENDPOINTS, FRONTEND_PATHS} from "@/constants/environment"
import {STRINGS} from "@/constants/ui-strings/PrescriptionDetailsPageStrings"

import EpsSpinner from "@/components/EpsSpinner"
import {SiteDetailsCards} from "@/components/prescriptionDetails/SiteDetailsCards"
import {ItemsCards} from "@/components/prescriptionDetails/ItemsCards"
import {MessageHistoryCard} from "@/components/prescriptionDetails/MessageHistoryCard"
import EpsBackLink from "@/components/EpsBackLink"

import http from "@/helpers/axios"
import {logger} from "@/helpers/logger"
import {useSearchContext} from "@/context/SearchProvider"
import axios from "axios"
import {handleRestartLogin} from "@/helpers/logout"
import {useAuth} from "@/context/AuthProvider"
import {usePageTitle} from "@/hooks/usePageTitle"

export default function PrescriptionDetailsPage() {
  const auth = useAuth()

  const [loading, setLoading] = useState(true)

  const {setPrescriptionInformation} = usePrescriptionInformation()
  const {setPatientDetails, setPatientFallback} = usePatientDetails()

  const [prescriber, setPrescriber] = useState<OrgSummary | undefined>()
  const [nominatedDispenser, setNominatedDispenser] = useState<OrgSummary | undefined>()
  const [dispenser, setDispenser] = useState<OrgSummary | undefined>()
  const [items, setItems] = useState<Array<ItemDetails>>([])
  const [messageHistory, setMessageHistory] = useState<Array<MessageHistory>>([])
  const searchContext = useSearchContext()
  const navigate = useNavigate()
  usePageTitle(STRINGS.PRESCRIPTION_DETAILS_pageTitle)

  const getPrescriptionDetails = async (
    prescriptionId: string,
    prescriptionIssueNumber?: string | undefined
  ): Promise<PrescriptionDetailsResponse | undefined> => {
    logger.info("Prescription ID", prescriptionId)
    const searchParams = new URLSearchParams()
    if (prescriptionIssueNumber) {
      searchParams.append("issueNumber", prescriptionIssueNumber)
    }
    const url = `${API_ENDPOINTS.PRESCRIPTION_DETAILS}/${prescriptionId}`

    let payload: PrescriptionDetailsResponse | undefined
    try {
      // Attempt to fetch live prescription details from the API
      const response = await http.get(url, {params: searchParams})

      // Validate HTTP response status
      if (response.status !== 200) {
        throw new Error(`Status Code: ${response.status}`)
      }

      // Assign response payload or throw if none received
      payload = response.data
      setLoading(false)
      if (!payload) {
        throw new Error("No payload received from the API")
      }
    } catch (err) {
      if (axios.isAxiosError(err) && (err.response?.status === 401)) {
        const invalidSessionCause = err.response?.data?.invalidSessionCause
        logger.warn("prescriptionDetails triggered restart login due to:", invalidSessionCause)
        handleRestartLogin(auth, invalidSessionCause)
        return
      }
      logger.error("Failed to fetch prescription details", err)
      return
    }

    // Use the populated payload
    setPrescriptionInformation(payload)
    setItems(payload.items)
    setPrescriber(payload.prescriberOrg)
    setMessageHistory(payload.messageHistory)
    setDispenser(payload.currentDispenser)
    setNominatedDispenser(payload.nominatedDispenser)
    setPatientDetails(payload.patientDetails)
    setPatientFallback(payload.patientFallback)

    return payload
  }

  useEffect(() => {
    const runGetPrescriptionDetails = async () => {
      const prescriptionId = searchContext.prescriptionId
      if (!prescriptionId) {
        logger.info("No prescriptionId provided - redirecting to search")
        navigate(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
        return
      }
      const prescriptionIssueNumber = searchContext.issueNumber

      logger.info("useEffect triggered for prescription:", prescriptionId)
      setLoading(true)
      await getPrescriptionDetails(prescriptionId, prescriptionIssueNumber)
    }

    runGetPrescriptionDetails()
  }, [])

  if (loading) {
    return (
      <main
        id="main-content"
        className="nhsuk-main-wrapper nhsuk-main-wrapper--s"
      >
        <Container width="full" fluid={true} className="container-details-page">
          <Row>
            <Col width="full">
              <h1 className="nhsuk-u-visually-hidden">{STRINGS.HEADER}</h1>
              <h2 data-testid="loading-message">
                {STRINGS.LOADING_FULL_PRESCRIPTION}
              </h2>
              <EpsSpinner />
            </Col>
          </Row>
        </Container>
      </main>
    )
  }

  return (
    <Container width="full" fluid={true} className="container-details-page">
      <nav className="nhsuk-breadcrumb">
        <EpsBackLink data-testid="go-back-link">{STRINGS.GO_BACK}</EpsBackLink>
      </nav>
      <main
        id="main-content"
      >
        <Row>
          <Col width="full">
            <h1 className="nhsuk-u-visually-hidden">{STRINGS.HEADER}</h1>
          </Col>
        </Row>
        {/* === Main Grid Layout === */}
        <Row>
          <ItemsCards items={items} />
          {/* Prescriber and dispenser information */}
          <Col width="one-third">
            <SiteDetailsCards
              prescriber={prescriber!}
              dispenser={dispenser}
              nominatedDispenser={nominatedDispenser}
            />
          </Col>
          {/* Message history timeline */}
          <MessageHistoryCard messageHistory={messageHistory} />
        </Row>
      </main >
    </Container>
  )
}
