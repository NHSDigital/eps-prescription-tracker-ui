// import React from "react"
// import {render, screen} from "@testing-library/react"
// import userEvent from "@testing-library/user-event"

// import {
//   BrowserRouter,
//   Route,
//   Routes,
//   useLocation
// } from "react-router-dom"

// import {PrescriptionsListStrings} from "@/constants/ui-strings/PrescriptionListTabStrings"

// import {PrescriptionSummary, TreatmentType} from "@cpt-ui-common/common-types"

// // This mock just displays the data. Nothing fancy!
// jest.mock("@/components/prescriptionList/PrescriptionsListTable", () => {
//   return function DummyPrescriptionsList({
//     textContent,
//     prescriptions
//   }: {
//     textContent: PrescriptionsListStrings
//     prescriptions: Array<PrescriptionSummary>
//   }) {
//     const location = useLocation()
//     return (
//       <div data-testid={textContent.testid}>
//         <p>{textContent.heading}</p>
//         <p data-testid="mock-prescription-data">Count: {prescriptions.length}</p>
//         <p>{location.pathname}</p>
//       </div>
//     )
//   }
// })

// import PrescriptionsListTabs from "@/components/prescriptionList/PrescriptionsListTab"
// import PrescriptionsListTable from "@/components/prescriptionList/PrescriptionsListTable"

// describe("PrescriptionsListTabs", () => {
//   const currentPrescriptions: Array<PrescriptionSummary> = [
//     {
//       prescriptionId: "C0C757-A83008-C2D93O",
//       statusCode: "001",
//       issueDate: "2025-03-01",
//       prescriptionTreatmentType: TreatmentType.REPEAT,
//       issueNumber: 1,
//       maxRepeats: 5,
//       prescriptionPendingCancellation: false,
//       itemsPendingCancellation: false
//     },
//     {
//       prescriptionId: "209E3D-A83008-327F9F",
//       statusCode: "002",
//       issueDate: "2025-03-02",
//       prescriptionTreatmentType: TreatmentType.REPEAT,
//       issueNumber: 1,
//       maxRepeats: 5,
//       prescriptionPendingCancellation: false,
//       itemsPendingCancellation: false
//     }
//   ]

//   const pastPrescriptions: Array<PrescriptionSummary> = [
//     {
//       prescriptionId: "RX003",
//       statusCode: "003",
//       issueDate: "2025-01-01",
//       prescriptionTreatmentType: TreatmentType.ACUTE,
//       issueNumber: 1,
//       maxRepeats: 5,
//       prescriptionPendingCancellation: false,
//       itemsPendingCancellation: false
//     }
//   ]

//   const futurePrescriptions: Array<PrescriptionSummary> = [
//     {
//       prescriptionId: "RX004",
//       statusCode: "004",
//       issueDate: "2025-04-01",
//       prescriptionTreatmentType: TreatmentType.REPEAT,
//       issueNumber: 1,
//       maxRepeats: 5,
//       prescriptionPendingCancellation: false,
//       itemsPendingCancellation: false
//     },
//     {
//       prescriptionId: "RX005",
//       statusCode: "005",
//       issueDate: "2025-04-02",
//       prescriptionTreatmentType: TreatmentType.REPEAT,
//       issueNumber: 1,
//       maxRepeats: 5,
//       prescriptionPendingCancellation: false,
//       itemsPendingCancellation: false
//     },
//     {
//       prescriptionId: "RX006",
//       statusCode: "006",
//       issueDate: "2025-04-03",
//       prescriptionTreatmentType: TreatmentType.REPEAT,
//       issueNumber: 1,
//       maxRepeats: 5,
//       prescriptionPendingCancellation: false,
//       itemsPendingCancellation: false
//     }
//   ]

//   const tabData = [
//     {
//       title: "Current Prescriptions",
//       link: "/prescription-list-current"
//     },
//     {
//       title: "Future Prescriptions",
//       link: "/prescription-list-future"
//     },
//     {
//       title: "Past Prescriptions",
//       link: "/prescription-list-past"
//     }
//   ]

//   beforeEach(() => {
//     const page =
//     <div>
//       <PrescriptionsListTabs
//         tabData={tabData}
//         currentPrescriptions={currentPrescriptions}
//         futurePrescriptions={futurePrescriptions}
//         pastPrescriptions={pastPrescriptions}
//       />
//       <PrescriptionsListTable
//       textContent={}
//       prescriptions={pres}
//       />
//       </div>
//     render(
//       <BrowserRouter>
//         <Routes>
//           <Route path="*" element={page} />
//         </Routes>
//       </BrowserRouter>
//     )
//   })

//   it("renders a table", () => {
//     currentPrescriptions
//   })
