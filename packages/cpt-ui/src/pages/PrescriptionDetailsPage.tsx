import {useContext, useEffect, useState} from "react"
import {Link, useNavigate, useSearchParams} from "react-router-dom"

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
  DispensedItem,
  PrescribedItem,
  MessageHistory
} from "@cpt-ui-common/common-types"

import {AuthContext} from "@/context/AuthProvider"
import {usePrescriptionInformation} from "@/context/PrescriptionInformationProvider"
import {usePatientDetails} from "@/context/PatientDetailsProvider"

import {API_ENDPOINTS, FRONTEND_PATHS, NHS_REQUEST_URID} from "@/constants/environment"
import {STRINGS} from "@/constants/ui-strings/PrescriptionDetailsPageStrings"

import EpsSpinner from "@/components/EpsSpinner"
import {SiteDetailsCards} from "@/components/prescriptionDetails/SiteDetailsCards"
import {PrescribedDispensedItemsCards} from "@/components/prescriptionDetails/PrescribedDispensedItemsCards"
import {MessageHistoryCard} from "@/components/prescriptionDetails/MessageHistoryCard"

import http from "@/helpers/axios"
import {getMockPayload} from "@/helpers/mockPayload"

export default function PrescriptionDetailsPage() {
  const auth = useContext(AuthContext)
  const navigate = useNavigate()
  const [queryParams] = useSearchParams()

  const [loading, setLoading] = useState(true)

  const {setPrescriptionInformation} = usePrescriptionInformation()
  const {setPatientDetails} = usePatientDetails()

  const [prescriber, setPrescriber] = useState<PrescriberOrganisationSummary | undefined>()
  const [nominatedDispenser, setNominatedDispenser] = useState<OrganisationSummary | undefined>()
  const [dispenser, setDispenser] = useState<OrganisationSummary | undefined>()
  const [prescribedItems, setPrescribedItems] = useState<Array<PrescribedItem>>([])
  const [dispensedItems, setDispensedItems] = useState<Array<DispensedItem>>([])
  const [messageHistory, setMessageHistory] = useState<Array<MessageHistory>>([])

  const getPrescriptionDetails = async (prescriptionId: string) => {
    console.log("Prescription ID", prescriptionId)
    const url = `${API_ENDPOINTS.PRESCRIPTION_DETAILS}/${prescriptionId}`

    let payload: PrescriptionDetailsResponse | undefined
    try {
      // Attempt to fetch live prescription details from the API
      const response = await http.get(url, {
        headers: {
          Authorization: `Bearer ${auth?.idToken}`,
          "NHSD-Session-URID": NHS_REQUEST_URID
        }
      })

      // Validate HTTP response status
      if (response.status !== 200) {
        throw new Error(`Status Code: ${response.status}`)
      }

      // Assign response payload or throw if none received
      payload = response.data
      if (!payload) {
        throw new Error("No payload received from the API")
      }
    } catch (err) {
      console.error("Failed to fetch prescription details. Using mock data fallback.", err)

      // FIXME: This is a static, mock data fallback we can use in lieu of the real data
      // backend endpoint, which is still waiting for the auth SNAFU to get sorted out.
      const mockPayload = getMockPayload(prescriptionId)

      // If no matching mock scenario exists, redirect to 'not found' page and reset state
      if (!mockPayload) {
        setPrescriptionInformation(undefined)
        setPatientDetails(undefined)
        setPrescriber(undefined)
        setDispenser(undefined)
        setNominatedDispenser(undefined)
        navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
        return
      }

      payload = mockPayload
    }

    // Use the populated payload (retrieved live or from mock fallback)
    setPrescriptionInformation(payload)
    setPatientDetails(payload.patientDetails)
    setPrescribedItems(payload.prescribedItems)
    setDispensedItems(payload.dispensedItems)
    setPrescriber(payload.prescriberOrganisation.organisationSummaryObjective)
    setMessageHistory(payload.messageHistory)

    if (!payload.currentDispenser) {
      setDispenser(undefined)
    } else {
      setDispenser(payload.currentDispenser[0].organisationSummaryObjective)
    }

    if (!payload.nominatedDispenser) {
      setNominatedDispenser(undefined)
    } else {
      setNominatedDispenser(payload.nominatedDispenser.organisationSummaryObjective)
    }
  }

  useEffect(() => {
    const runGetPrescriptionDetails = async () => {
      setLoading(true)

      const prescriptionId = queryParams.get("prescriptionId")
      if (!prescriptionId) {
        navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
      }
      await getPrescriptionDetails(prescriptionId!)

      setLoading(false)
    }
    runGetPrescriptionDetails()
  }, [])

  if (loading || !prescriber) {
    return (
      <main id="main-content" className="nhsuk-main-wrapper nhsuk-main-wrapper--s">
        <Container>
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
      <Container width="full" fluid={true}>
        <Row>
          <Col width="full">
            <BackLink
              data-testid="go-back-link"
              asElement={Link}
              to={`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?${queryParams.toString()}`}
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
              prescriber={prescriber}
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
