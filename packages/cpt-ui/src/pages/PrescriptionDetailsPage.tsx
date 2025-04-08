import React, {useEffect, useState} from "react"
import {useSearchParams} from "react-router-dom"
import {usePrescriptionInformation} from "@/context/PrescriptionInformationProvider"
import {usePatientDetails} from "@/context/PatientDetailsProvider"
import {Container, Row, Col} from "nhsuk-react-components"
import EpsSpinner from "@/components/EpsSpinner"
import {EpsSpinnerStrings} from "@/constants/ui-strings/EpsSpinnerStrings"

export default function PrescriptionDetailsPage() {
  const [searchParams] = useSearchParams()
  const prescriptionId = searchParams.get("prescriptionId")
  const {setPrescriptionInformation} = usePrescriptionInformation()
  const {setPatientDetails} = usePatientDetails()

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!prescriptionId) {
        setLoading(false)
        return
      }

      // Simulate data fetch delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (prescriptionId === "C0C757-A83008-C2D93O") {
        setPrescriptionInformation({
          id: prescriptionId,
          issueDate: "18-Jan-2024",
          status: "All items dispensed",
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
      }

      if (prescriptionId === "EC5ACF-A83008-733FD3") {
        setPrescriptionInformation({
          id: prescriptionId,
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
              <EpsSpinner message={EpsSpinnerStrings.loadingFullPrescription} />
            </Col>
          </Row>
        </Container>
      </main>
    )
  }

  return (
    <main id="prescription-details-page" className="nhsuk-main-wrapper">
      <Container>
        <Row>
          <Col width="full">
            <h2 className="nhsuk-heading-l">Prescription Details</h2>
          </Col>
        </Row>
      </Container>
    </main>
  )
}
