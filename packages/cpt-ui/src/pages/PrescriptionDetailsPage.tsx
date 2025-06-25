import {useEffect, useState} from "react"
import {Link} from "react-router-dom"

import {
  BackLink,
  Col,
  Container,
  Row
} from "nhsuk-react-components"

import {
  PrescriberOrganisationSummary,
  OrganisationSummary,
  PrescriptionDetailsResponse,
  PrescribedItemDetails,
  DispensedItemDetails,
  MessageHistory
} from "@cpt-ui-common/common-types"

import {usePrescriptionInformation} from "@/context/PrescriptionInformationProvider"
import {usePatientDetails} from "@/context/PatientDetailsProvider"

import {API_ENDPOINTS, FRONTEND_PATHS} from "@/constants/environment"
import {STRINGS} from "@/constants/ui-strings/PrescriptionDetailsPageStrings"

import EpsSpinner from "@/components/EpsSpinner"
import {SiteDetailsCards} from "@/components/prescriptionDetails/SiteDetailsCards"
import {PrescribedDispensedItemsCards} from "@/components/prescriptionDetails/PrescribedDispensedItemsCards"
import {MessageHistoryCard} from "@/components/prescriptionDetails/MessageHistoryCard"

import http from "@/helpers/axios"
import {logger} from "@/helpers/logger"
import {useSearchContext} from "@/context/SearchProvider"

export default function PrescriptionDetailsPage() {

  const [loading, setLoading] = useState(true)

  const {setPrescriptionInformation} = usePrescriptionInformation()
  const {setPatientDetails} = usePatientDetails()

  const [prescriber, setPrescriber] = useState<PrescriberOrganisationSummary | undefined>()
  const [nominatedDispenser, setNominatedDispenser] = useState<OrganisationSummary | undefined>()
  const [dispenser, setDispenser] = useState<OrganisationSummary | undefined>()
  const [prescribedItems, setPrescribedItems] = useState<Array<PrescribedItemDetails>>([])
  const [dispensedItems, setDispensedItems] = useState<Array<DispensedItemDetails>>([])
  const [messageHistory, setMessageHistory] = useState<Array<MessageHistory>>([])
  const searchContext = useSearchContext()

  const getPrescriptionDetails = async (
    prescriptionId: string,
    prescriptionIssueNumber?: string | undefined
  ): Promise<PrescriptionDetailsResponse | undefined> => {
    logger.info("Prescription ID", prescriptionId)
    const issueNumber = prescriptionIssueNumber ?? "1"
    const url = `${API_ENDPOINTS.PRESCRIPTION_DETAILS}/${prescriptionId}?issueNumber=${issueNumber}`

    let payload: PrescriptionDetailsResponse | undefined
    try {
      // Attempt to fetch live prescription details from the API
      const response = await http.get(url)

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
      logger.error("Failed to fetch prescription details", err)
      return
    }

    // Use the populated payload (retrieved live or from mock fallback)
    setPrescriptionInformation(payload)
    setPatientDetails(payload.patientDetails)
    setPrescribedItems(payload.prescribedItems)
    setDispensedItems(payload.dispensedItems)
    setPrescriber(payload.prescriberOrganisation)
    setMessageHistory(payload.messageHistory)

    if (!payload.currentDispenser) {
      setDispenser(undefined)
    } else {
      setDispenser(payload.currentDispenser)
    }

    if (!payload.nominatedDispenser) {
      setNominatedDispenser(undefined)
    } else {
      setNominatedDispenser(payload.nominatedDispenser)
    }

    return payload
  }

  useEffect(() => {
    const runGetPrescriptionDetails = async () => {

      const prescriptionId = searchContext.prescriptionId
      if (!prescriptionId) {
        logger.error("No prescriptionId provided in query params.")
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
      <main id="main-content" className="nhsuk-main-wrapper nhsuk-main-wrapper--s">
        <Container width="full" fluid={true} className="container-details-page">
          <Row>
            <Col width="full">
              <h1
                className="nhsuk-u-visually-hidden"
              >
                {STRINGS.HEADER}
              </h1>
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
    <main id="main-content" className="nhsuk-main-wrapper nhsuk-main-wrapper--s">
      <Container width="full" fluid={true} className="container-details-page">
        <Row>
          <Col width="full">
            <BackLink
              data-testid="go-back-link"
              asElement={Link}
              to={`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}`}
            >
              {STRINGS.GO_BACK}
            </BackLink>
          </Col>
        </Row>
        <Row>
          <Col width="full">
            <h1 className="nhsuk-u-visually-hidden">{STRINGS.HEADER}</h1>
          </Col>
        </Row>
        {/* === Main Grid Layout === */}
        <Row>
          {/* Prescribed/Dispensed items */}
          <PrescribedDispensedItemsCards
            prescribedItems={prescribedItems}
            dispensedItems={dispensedItems}
          />
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
      </Container>
    </main>
  )
}
