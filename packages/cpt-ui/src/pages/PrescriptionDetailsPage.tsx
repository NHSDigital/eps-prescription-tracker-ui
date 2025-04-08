import {useContext, useEffect, useState} from "react"
import {useNavigate, useSearchParams} from "react-router-dom"

import {Col, Container, Row} from "nhsuk-react-components"

import {
  PrescriberOrganisationSummary,
  OrganisationSummary,
  PrescriptionDetailsResponse
} from "@cpt-ui-common/common-types/src/prescriptionDetails"

import {AuthContext} from "@/context/AuthProvider"

import {API_ENDPOINTS, FRONTEND_PATHS, NHS_REQUEST_URID} from "@/constants/environment"

import EpsSpinner from "@/components/EpsSpinner"
import {SiteDetailsCards} from "@/components/SiteDetailsCards"

import http from "@/helpers/axios"

// Mock data, lifted from the prototype page.
const mockPrescriber: PrescriberOrganisationSummary = {
  name: "Fiji surgery",
  odsCode: "FI05964",
  address: "90 YARROW LANE, FINNSBURY, E45 T46",
  telephone: "01232 231321",
  prescribedFrom: "England"
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
  address: "7&8 WELLINGTON PLACE, LEEDS, LS1 4AP",
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
      if (prescriptionId === "C0C757-A83008-C2D93O") {
        setPrescriber(mockPrescriber)
        setDispenser(mockDispenser)
        setNominatedDispenser(mockNominatedDispenser)
      } else if (prescriptionId === "209E3D-A83008-327F9F") {
        setPrescriber(mockPrescriber)
        setDispenser(undefined)
        setNominatedDispenser(undefined)
      } else if (prescriptionId === "7F1A4B-A83008-91DC2E") {
        setPrescriber(mockPrescriber)
        setDispenser(mockDispenser)
        setNominatedDispenser(undefined)
      } else if (prescriptionId === "B8C9E2-A83008-5F7B3A") {
        setPrescriber(mockPrescriber)
        setDispenser(mockDispenser)
        setNominatedDispenser(altMockNominatedDispenser)
      } else if (prescriptionId === "4D6F2C-A83008-A3E7D1") {
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
    <div className={"nhsuk-u-margin-top-2 nhsuk-u-margin-left-2"}>
      <SiteDetailsCards
        prescriber={prescriber}
        dispenser={dispenser}
        nominatedDispenser={nominatedDispenser}
      />
    </div>
  )
}
