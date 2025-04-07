import React, {useEffect} from "react"
import {useSearchParams} from "react-router-dom"
import {usePrescriptionInformation} from "@/context/PrescriptionInformationProvider"
import {Container, Row, Col} from "nhsuk-react-components"

export default function PrescriptionDetailsPage() {
  const [searchParams] = useSearchParams()
  const prescriptionId = searchParams.get("prescriptionId")
  const {setPrescriptionInformation} = usePrescriptionInformation()

  useEffect(() => {
    if (!prescriptionId) return

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
    }
  }, [prescriptionId, setPrescriptionInformation])

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
