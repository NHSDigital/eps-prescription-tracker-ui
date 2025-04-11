import {useEffect, useState} from "react"
import {useSearchParams} from "react-router-dom"
import {
  BackLink,
  Container,
  Row,
  Col
} from "nhsuk-react-components"
import {PrescribedDispensedItems} from "@/components/PrescribedDispensedItemsCards"
import EpsSpinner from "@/components/EpsSpinner"
import {PRESCRIPTION_DETAILS_PAGE_STRINGS} from "@/constants/ui-strings/PrescriptionDetailsPageStrings"
import {usePrescriptionInformation} from "@/context/PrescriptionInformationProvider"
import {usePatientDetails} from "@/context/PatientDetailsProvider"
import {DispensedItem} from "@cpt-ui-common/common-types/src/prescriptionDetails"

export default function PrescriptionDetailsPage() {
  const [searchParams] = useSearchParams()
  const prescriptionId = searchParams.get("prescriptionId")
  const {setPrescriptionInformation} = usePrescriptionInformation()
  const {setPatientDetails} = usePatientDetails()

  const [loading, setLoading] = useState(true)
  const [dispensedItems, setDispensedItems] = useState<Array<DispensedItem>>([])

  useEffect(() => {
    const loadData = async () => {
      if (!prescriptionId) {
        setLoading(false)
        return
      }

      // Simulate delay for loading state
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (prescriptionId === "C0C757-A83008-C2D93O") {
        setPrescriptionInformation({
          prescriptionId: prescriptionId,
          issueDate: "18-Jan-2024",
          status: "Some items dispensed",
          type: "Acute",
          isERD: false,
          instanceNumber: undefined,
          maxRepeats: undefined,
          daysSupply: undefined
        })

        setPatientDetails({
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
        })

        // Mocked dispensed items
        setDispensedItems([
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
          },
          {
            itemDetails: {
              medicationName: "Oseltamivir 30mg capsules",
              quantity: "20 capsules",
              dosageInstructions: "One capsule twice a day ",
              epsStatusCode: "0001",
              nhsAppStatus: "Item not dispensed - owing",
              pharmacyStatus: "With pharmacy",
              itemPendingCancellation: false
            }
          }
        ])
      }

      if (prescriptionId === "EC5ACF-A83008-733FD3") {
        setPrescriptionInformation({
          prescriptionId: prescriptionId,
          issueDate: "22-Jan-2025",
          status: "All items dispensed",
          type: "eRD",
          isERD: true,
          instanceNumber: 2,
          maxRepeats: 6,
          daysSupply: 28
        })

        setPatientDetails({
          nhsNumber: "5900009890",
          prefix: "Ms",
          suffix: "",
          given: "Janet",
          family: "Piper",
          gender: null,
          dateOfBirth: null,
          address: null
        })
      }

      setLoading(false)
    }

    loadData()
  }, [prescriptionId, setPrescriptionInformation, setPatientDetails])

  if (loading) {
    return (
      <main className="nhsuk-main-wrapper" id="prescription-details-page">
        <Container>
          <Row>
            <Col width="full">
              <h2>{PRESCRIPTION_DETAILS_PAGE_STRINGS.LOADING_FULL_PRESCRIPTION}</h2>
              <EpsSpinner />
            </Col>
          </Row>
        </Container>
      </main>
    )
  }

  return (

    <Container
      className={"nhsuk-main-wrapper nhsuk-main-wrapper--s nhsuk-u-margin-left-9"}
      width="100%"
      style={{maxWidth: "100%"}}
    >
      <Row>
        <Col width="full">
          <BackLink
            data-testid="go-back-link"
          >
            {PRESCRIPTION_DETAILS_PAGE_STRINGS.GO_BACK}
          </BackLink>
        </Col>
      </Row>
      <Row>
        <PrescribedDispensedItems items={dispensedItems} />
      </Row>
    </Container>

  )
}
