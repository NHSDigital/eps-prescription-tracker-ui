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
  PatientDetails,
  OrganisationSummary,
  PrescriptionDetailsResponse,
  DispensedItem,
  PrescribedItem
} from "@cpt-ui-common/common-types"

import {AuthContext} from "@/context/AuthProvider"
import {usePrescriptionInformation} from "@/context/PrescriptionInformationProvider"
import {usePatientDetails} from "@/context/PatientDetailsProvider"

import {API_ENDPOINTS, FRONTEND_PATHS, NHS_REQUEST_URID} from "@/constants/environment"
import {STRINGS} from "@/constants/ui-strings/PrescriptionDetailsPageStrings"

import EpsSpinner from "@/components/EpsSpinner"
import {SiteDetailsCards} from "@/components/SiteDetailsCards"
import {PrescribedDispensedItemsCards} from "@/components/PrescribedDispensedItemsCards"

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

const mockPrescriptionInformation = {
  prescriptionId: "",
  issueDate: "18-Jan-2024",
  statusCode: "Some items dispensed", // FIXME: The banner does not use codes? Needs to be implemented!
  typeCode: "Acute",
  isERD: false,
  instanceNumber: 2,
  maxRepeats: 6,
  daysSupply: "28"
}

const mockPrescriptionInformationErd = {
  prescriptionId: "",
  issueDate: "22-Mar-2024",
  statusCode: "Some items dispensed",
  typeCode: "eRD",
  isERD: true,
  instanceNumber: 1,
  maxRepeats: 6,
  daysSupply: "28"
}

const mockPatientDetails: PatientDetails = {
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

const mockUnavailablePatientDetails: PatientDetails = {
  nhsNumber: "5900009890",
  prefix: "Ms",
  suffix: "",
  given: "Janet",
  family: "Piper",
  gender: null,
  dateOfBirth: null,
  address: null
}

const mockDispensedItems: Array<DispensedItem> = [
  {
    itemDetails: {
      medicationName: "Raberprazole 10mg tablets",
      quantity: "56 tablets",
      dosageInstructions: "Take one twice daily",
      epsStatusCode: "0001",
      nhsAppStatus: "Item fully dispensed",
      pharmacyStatus: "Collected",
      itemPendingCancellation: false
    }
  },
  {
    itemDetails: {
      medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
      quantity: "1 spray",
      dosageInstructions: "Use as needed",
      epsStatusCode: "0001",
      nhsAppStatus: "Item fully dispensed",
      pharmacyStatus: "Collected",
      itemPendingCancellation: false
    }
  }
]

const mockPrescribedItems: Array<PrescribedItem> = [
  {
    itemDetails: {
      medicationName: "Oseltamivir 30mg capsules",
      quantity: "20 capsules",
      dosageInstructions: "One capsule twice a day",
      epsStatusCode: "0004",
      nhsAppStatus: "Item not dispensed - owing",
      pharmacyStatus: "With pharmacy",
      itemPendingCancellation: false,
      cancellationReason: null
    }
  }
]

const mockPrescribedItemsCancellation: Array<PrescribedItem> = [
  {
    itemDetails: {
      medicationName: "Phosphates enema (Formula B) 129ml standard tube",
      quantity: "1 tube",
      dosageInstructions: "Use ONE when required",
      epsStatusCode: "0003",
      nhsAppStatus: "Item to be dispensed",
      pharmacyStatus: "With pharmacy",
      itemPendingCancellation: true,
      cancellationReason: "Prescribing error"
    }
  },
  {
    itemDetails: {
      medicationName: "Mirtazapine 30mg",
      quantity: "1 spray",
      dosageInstructions: "Use as needed",
      epsStatusCode: "0003",
      nhsAppStatus: "Item to be dispensed",
      pharmacyStatus: "With pharmacy",
      itemPendingCancellation: true,
      cancellationReason: "Prescribing error"
    }
  },
  {
    itemDetails: {
      medicationName: "Oseltamivir 30mg capsules",
      quantity: "20 capsules",
      dosageInstructions: "One capsule twice a day",
      epsStatusCode: "0003",
      nhsAppStatus: "Item to be dispensed",
      pharmacyStatus: "With pharmacy",
      itemPendingCancellation: true,
      cancellationReason: "Prescribing error"
    }
  },
  {
    itemDetails: {
      medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
      quantity: "21 tablets",
      dosageInstructions: "Take 3 times a day with water",
      epsStatusCode: "0003",
      nhsAppStatus: "Item to be dispensed",
      pharmacyStatus: "With pharmacy",
      itemPendingCancellation: true,
      cancellationReason: "Prescribing error"
    }
  }
]

const mockDispensedPartialWithInitial: Array<DispensedItem> = [
  {
    itemDetails: {
      medicationName: "Raberprazole 10mg tablets",
      quantity: "28 out of 56 tablets",
      dosageInstructions: "Take one twice daily",
      epsStatusCode: "0002",
      nhsAppStatus: "Item dispensed - partial",
      pharmacyStatus: "Collected",
      itemPendingCancellation: false,
      initiallyPrescribed: {
        medicationName: "Raberprazole 10mg tablets",
        quantity: "56 tablets",
        dosageInstructions: "Take one twice daily"
      }
    }
  },
  {
    itemDetails: {
      medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
      quantity: "1 spray",
      dosageInstructions: "Use as needed",
      epsStatusCode: "0001",
      nhsAppStatus: "Item fully dispensed",
      pharmacyStatus: "Collected",
      itemPendingCancellation: false
    }
  }
]

const mockDispensedItemsNoPharmacyStatus: Array<DispensedItem> = [
  {
    itemDetails: {
      medicationName: "Raberprazole 10mg tablets",
      quantity: "56 tablets",
      dosageInstructions: "Take one twice daily",
      epsStatusCode: "0001",
      nhsAppStatus: "Item fully dispensed",
      pharmacyStatus: undefined,
      itemPendingCancellation: false
    }
  },
  {
    itemDetails: {
      medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
      quantity: "1 spray",
      dosageInstructions: "Use as needed",
      epsStatusCode: "0001",
      nhsAppStatus: "Item fully dispensed",
      pharmacyStatus: undefined,
      itemPendingCancellation: false
    }
  },
  {
    itemDetails: {
      medicationName: "Oseltamivir 30mg capsules",
      quantity: "20 capsules",
      dosageInstructions: "One capsule twice a day",
      epsStatusCode: "0001",
      nhsAppStatus: "Item fully dispensed",
      pharmacyStatus: undefined,
      itemPendingCancellation: false
    }
  }
]

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

  const getPrescriptionDetails = async (prescriptionId: string) => {
    console.log("Prescription ID", prescriptionId)
    const url = `${API_ENDPOINTS.PRESCRIPTION_DETAILS}/${prescriptionId}`

    let payload: PrescriptionDetailsResponse | undefined
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

      payload = response.data
      if (!payload) {
        throw new Error("No payload received from the API")
      }
    } catch (err) {
      console.error(err)

      //
      // FIXME: This is a static, mock data fallback we can use in lieu of the real data
      // backend endpoint, which is still waiting for the auth SNAFU to get sorted out.
      //

      // Shared properties
      const commonPrescriptionData = {
        ...mockPrescriptionInformation,
        prescriptionId: prescriptionId,
        patientDetails: mockPatientDetails,
        prescriptionPendingCancellation: false,
        prescribedItems: [],
        dispensedItems: [],
        messageHistory: []
      }

      // Construct payload based on the prescriptionId.
      if (prescriptionId === "C0C757-A83008-C2D93O") {
        // Full vanilla data: all organisations populated.
        payload = {
          ...commonPrescriptionData,
          prescribedItems: mockPrescribedItems,
          dispensedItems: mockDispensedItems,
          prescriberOrganisation: {organisationSummaryObjective: mockPrescriber},
          nominatedDispenser: {organisationSummaryObjective: mockNominatedDispenser},
          currentDispenser: [{organisationSummaryObjective: mockDispenser}]
        }
      } else if (prescriptionId === "209E3D-A83008-327F9F") {
        // Alt prescriber only: no dispenser data and unavailable patient details.
        payload = {
          ...commonPrescriptionData,
          prescribedItems: mockPrescribedItems,
          dispensedItems: mockDispensedItems,
          patientDetails: mockUnavailablePatientDetails,
          prescriberOrganisation: {organisationSummaryObjective: altMockPrescriber},
          nominatedDispenser: undefined,
          currentDispenser: undefined
        }
      } else if (prescriptionId === "7F1A4B-A83008-91DC2E") {
        // Prescriber and dispenser only.
        payload = {
          ...commonPrescriptionData,
          ...mockPrescriptionInformationErd,
          prescribedItems: mockPrescribedItemsCancellation,
          prescriberOrganisation: {organisationSummaryObjective: mockPrescriber},
          nominatedDispenser: undefined,
          currentDispenser: [{organisationSummaryObjective: mockDispenser}]
        }
      } else if (prescriptionId === "B8C9E2-A83008-5F7B3A") {
        // All populated, with a long address nominated dispenser.
        payload = {
          ...commonPrescriptionData,
          prescribedItems: [],
          dispensedItems: mockDispensedPartialWithInitial,
          prescriberOrganisation: {organisationSummaryObjective: altMockPrescriber},
          nominatedDispenser: {organisationSummaryObjective: altMockNominatedDispenser},
          currentDispenser: [{organisationSummaryObjective: mockDispenser}]
        }
      } else if (prescriptionId === "4D6F2C-A83008-A3E7D1") {
        // Missing nominated dispenser data.
        payload = {
          ...commonPrescriptionData,
          dispensedItems: mockDispensedItemsNoPharmacyStatus,
          prescriberOrganisation: {organisationSummaryObjective: mockPrescriber},
          nominatedDispenser: {
            organisationSummaryObjective: {
              name: undefined,
              odsCode: "FV519",
              address: undefined,
              telephone: undefined
            }
          },
          currentDispenser: [{organisationSummaryObjective: mockDispenser}]
        }
      } else {
        // Error condition here, no matching mock found so we clear it all out and redirect
        setPrescriptionInformation(undefined)
        setPatientDetails(undefined)
        setPrescriber(undefined)
        setDispenser(undefined)
        setNominatedDispenser(undefined)
        navigate(FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND)
        return
      }
    }

    // Use the populated payload (retrieved live or from mock fallback).
    setPrescriptionInformation(payload)
    setPatientDetails(payload.patientDetails)
    setPrescribedItems(payload.prescribedItems)
    setDispensedItems(payload.dispensedItems)

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
    <main id="main-content" className="nhsuk-main-wrapper">
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
        </Row>
      </Container>
    </main>
  )
}
