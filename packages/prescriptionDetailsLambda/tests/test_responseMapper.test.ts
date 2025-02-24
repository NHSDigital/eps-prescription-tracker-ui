import {mergePrescriptionDetails} from "../src/utils/responseMapper"
// import {PrescriptionDetails, DoHSData, MergedResponse} from "../src/utils/types"

describe("mergePrescriptionDetails", () => {
  // it("should merge prescription details and DoHS data correctly", () => {
  //   const prescriptionDetails: PrescriptionDetails = {
  //     resourceType: "Bundle",
  //     type: "collection",
  //     entry: [
  //       {
  //         resource: {
  //           resourceType: "RequestGroup",
  //           groupIdentifier: {system: "system", value: "C0C757-A83008-C2D93O"},
  //           status: "active",
  //           code: {coding: [{system: "system", code: "0101", display: "Prescription Type"}]},
  //           author: {
  //             reference: "Practitioner/FA565",
  //             identifier: {
  //               system: "https://fhir.nhs.uk/Id/Practitioner",
  //               value: "FA565"
  //             }
  //           }
  //         }
  //       }
  //     ]
  //   }

  //   const doHSData: DoHSData = {
  //     value: [{
  //       OrganisationName: "BROOMWOOD PHARMACY",
  //       ODSCode: "FA565",
  //       Address1: "63 BRIARFIELD ROAD",
  //       City: "CHESHIRE",
  //       Postcode: "WA15 7DD",
  //       Contacts: [{
  //         ContactType: "Primary",
  //         ContactAvailabilityType: "Office hours",
  //         ContactMethodType: "Telephone",
  //         ContactValue: "01619800869"
  //       }]
  //     }]
  //   }

  //   const result = mergePrescriptionDetails(prescriptionDetails, doHSData) as MergedResponse

  //   expect(result).toMatchObject({
  //     patientDetails: expect.any(Object),
  //     prescriptionID: "C0C757-A83008-C2D93O",
  //     prescriberOrganisation: expect.objectContaining({
  //       organisationSummaryObjective: expect.objectContaining({
  //         name: "BROOMWOOD PHARMACY"
  //       })
  //     }),
  //     nominatedDispenser: expect.any(Object),
  //     currentDispenser: expect.any(Object)
  //   })
  // })

  it("should return 'Prescription details not found' when data is missing", () => {
    const result = mergePrescriptionDetails(null)
    expect(result).toHaveProperty("message", "Prescription details not found")
  })

  // it("should handle empty DoHS data gracefully", () => {
  //   const prescriptionDetails: PrescriptionDetails = {
  //     resourceType: "Bundle",
  //     type: "collection",
  //     entry: [{
  //       resource: {
  //         resourceType: "RequestGroup",
  //         groupIdentifier: {system: "system", value: "C0C757-A83008-C2D93O"}
  //       }
  //     }]
  //   }

  //   const result = mergePrescriptionDetails(prescriptionDetails)

  //   expect(result).toMatchObject({
  //     prescriptionID: "C0C757-A83008-C2D93O",
  //     prescriberOrganisation: expect.objectContaining({
  //       organisationSummaryObjective: expect.objectContaining({
  //         name: "Not found"
  //       })
  //     })
  //   })
  // })

  // it("should handle missing medication details gracefully", () => {
  //   const prescriptionDetails: PrescriptionDetails = {
  //     resourceType: "Bundle",
  //     type: "collection",
  //     entry: [{
  //       resource: {
  //         resourceType: "MedicationRequest",
  //         status: "active",
  //         medicationCodeableConcept: {
  //           coding: []
  //         }
  //       }
  //     }]
  //   }

  //   const result = mergePrescriptionDetails(prescriptionDetails) as MergedResponse

  //   expect(result.prescribedItems?.[0]?.itemDetails?.medicationName).toBe("Not found")
  // })

  // it("should handle null values for nominated and current dispenser", () => {
  //   const prescriptionDetails: PrescriptionDetails = {
  //     resourceType: "Bundle",
  //     type: "collection",
  //     entry: [{
  //       resource: {
  //         resourceType: "RequestGroup",
  //         groupIdentifier: {system: "system", value: "C0C757-A83008-C2D93O"}
  //       }
  //     }]
  //   }

  //   const result = mergePrescriptionDetails(prescriptionDetails)

  //   expect(result).toMatchObject({
  //     prescriptionID: "C0C757-A83008-C2D93O",
  //     nominatedDispenser: undefined,
  //     currentDispenser: undefined
  //   })
  // })
})
