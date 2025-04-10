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
  PrescriptionDetailsResponse
} from "@cpt-ui-common/common-types/src/prescriptionDetails"

import {AuthContext} from "@/context/AuthProvider"

import {API_ENDPOINTS, FRONTEND_PATHS, NHS_REQUEST_URID} from "@/constants/environment"
import {HEADER, GO_BACK} from "@/constants/ui-strings/PrescriptionDetailsPageStrings"

import EpsSpinner from "@/components/EpsSpinner"
import {SiteDetailsCards} from "@/components/SiteDetailsCards"

import http from "@/helpers/axios"

// Mock data, lifted from the prototype page.
const mockPrescriber: PrescriberOrganisationSummary = {
  name: "Fiji surgery",
  odsCode: "FI05964",
  address: "90 YARROW LANE, FINNSBURY, E45 T46",
  telephone: "01232 231321",
  prescribedFrom: "012345"
}

const altMockPrescriber: PrescriberOrganisationSummary = {
  name: "Fiji surgery",
  odsCode: "FI05964",
  address: "90 YARROW LANE, FINNSBURY, E45 T46",
  telephone: "01232 231321",
  prescribedFrom: "021345"
}

const mockDispenser: OrganisationSummary = {
  name: "Cohens chemist",
  odsCode: "FV519",
  address: "22 RUE LANE, CHISWICK, KT19 D12",
  telephone: "01943 863158"
}

const mockNominatedDispenser: OrganisationSummary = {
  name: "Cohens chemist",
  odsCode: "FV519",
  address: "22 RUE LANE, CHISWICK, KT19 D12",
  telephone: "01943 863158"
}

const altMockNominatedDispenser: OrganisationSummary = {
  name: "Some Guy",
  odsCode: "ABC123",
  // eslint-disable-next-line max-len
  address: "7&8 WELLINGTON PLACE, thisisaverylongwordthatshouldtriggerthelinetowraparoundwhilstbreakingthewordupintosmallerchunks, LEEDS, LS1 4AP",
  telephone: "07712 345678"
}

export default function PrescriptionDetailsPage() {
  const auth = useContext(AuthContext)
  const navigate = useNavigate()
  const [queryParams] = useSearchParams()

  const [loading, setLoading] = useState(true)

  const [prescriber, setPrescriber] = useState<PrescriberOrganisationSummary | undefined>()
  const [nominatedDispenser, setNominatedDispenser] = useState<OrganisationSummary | undefined>()
  const [dispenser, setDispenser] = useState<OrganisationSummary | undefined>()

  const getPrescriptionDetails = async (prescriptionId: string) => {
    console.log("Prescription ID", prescriptionId)
    const url = `${API_ENDPOINTS.PRESCRIPTION_DETAILS}/${prescriptionId}`
    try {
      const response = await http.get(url, {
        headers: {
          Authorization: `Bearer ${auth?.idToken}`,
          "NHSD-Session-URID": NHS_REQUEST_URID
        }
      })

      if (response.status !== 200) {
        throw new Error(`Status Code: ${response.status}`)
      }

      // TODO: Implement parsing out the response here...
      const payload: PrescriptionDetailsResponse = response.data

      setPrescriber(payload.prescriberOrganisation.organisationSummaryObjective)

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

    } catch (err) {
      console.error(err)
      // FIXME: Mock data for now, since we cant get live data.
      if (prescriptionId === "C0C757-A83008-C2D93O") { //     // Full vanilla data
        setPrescriber(mockPrescriber)
        setDispenser(mockDispenser)
        setNominatedDispenser(mockNominatedDispenser)
      } else if (prescriptionId === "209E3D-A83008-327F9F") { // Alt prescriber only
        setPrescriber(altMockPrescriber)
        setDispenser(undefined)
        setNominatedDispenser(undefined)
      } else if (prescriptionId === "7F1A4B-A83008-91DC2E") { // Prescriber and dispenser only
        setPrescriber(mockPrescriber)
        setDispenser(mockDispenser)
        setNominatedDispenser(undefined)
      } else if (prescriptionId === "B8C9E2-A83008-5F7B3A") { // All populated, long address nominated dispenser
        setPrescriber(altMockPrescriber)
        setDispenser(mockDispenser)
        setNominatedDispenser(altMockNominatedDispenser)
      } else if (prescriptionId === "4D6F2C-A83008-A3E7D1") { // missing data
        setPrescriber(mockPrescriber)
        setDispenser(mockDispenser)
        setNominatedDispenser({
          name: undefined,
          odsCode: "FV519",
          address: undefined,
          telephone: undefined
        })
      } else {
        setPrescriber(undefined)
        setDispenser(undefined)
        setNominatedDispenser(undefined)
        navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
      }
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
    // Temporary holding div to add padding. Not where this will actually be placed.
    <Container
      className={"nhsuk-main-wrapper nhsuk-main-wrapper--s nhsuk-u-margin-left-9"}
      width="100%"
      style={{maxWidth: "100%"}}
    >

      <Row>
        <Col width="full">
          <BackLink
            data-testid="go-back-link"
            asElement={Link}
            to={`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?${queryParams.toString()}`}
          >
            {GO_BACK}
          </BackLink>
        </Col>
      </Row>
      <Row>
        <Col width="full">
          <h1
            style={{display: "none"}}
          >
            {HEADER}
          </h1>
        </Col>
      </Row>
      <SiteDetailsCards
        prescriber={prescriber}
        dispenser={dispenser}
        nominatedDispenser={nominatedDispenser}
      />
    </Container>
  )
}
