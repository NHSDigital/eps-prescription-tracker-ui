import {describe, expect, it} from "@jest/globals"
import {mapSearchResponse, mapResponseToPrescriptionSummary} from "../src/utils/responseMapper"
import {Bundle} from "fhir/r4"
import {
  PatientSummary,
  PatientSummaryGender,
  PrescriptionAPIResponse,
  TreatmentType
} from "@cpt-ui-common/common-types"

describe("Response Mapper Tests", () => {
  describe("mapSearchResponse", () => {
    it("should include pds patient details when details have been successfully retrieved", async () => {
      const mockPatient: PatientSummary = {
        nhsNumber: "9999999999",
        gender: PatientSummaryGender.MALE,
        dateOfBirth: "1990-01-01",
        familyName: "Doe",
        givenName: ["John"],
        address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
        postcode: "LS1 6AE"
      }

      const result = mapSearchResponse(mockPatient, [])

      expect(result).toEqual({
        patient: {
          nhsNumber: "9999999999",
          gender: PatientSummaryGender.MALE,
          dateOfBirth: "1990-01-01",
          familyName: "Doe",
          givenName: ["John"],
          address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
          postcode: "LS1 6AE"
        },
        currentPrescriptions: [],
        futurePrescriptions: [],
        pastPrescriptions: []
      })
    })

    it("should fall back to patient details from the prescription when does not return any data", async () => {
      const mockPrescriptions: Array<PrescriptionAPIResponse> = [{
        prescriptionId: "335C70-A83008-84058A",
        isDeleted: false,
        statusCode: "0001",
        issueDate: "20250204000000",
        prescriptionTreatmentType: TreatmentType.ACUTE,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: false,
        nhsNumber: "9999999111",
        given: ["Fall"],
        family: "Back"
      }]

      const result = mapSearchResponse(undefined, mockPrescriptions)

      expect(result).toEqual({
        patient: {
          nhsNumber: "9999999111",
          familyName: "Back",
          givenName: ["Fall"]
        },
        currentPrescriptions: [{
          prescriptionId: "335C70-A83008-84058A",
          isDeleted: false,
          statusCode: "0001",
          issueDate: "20250204000000",
          prescriptionTreatmentType: TreatmentType.ACUTE,
          prescriptionPendingCancellation: false,
          itemsPendingCancellation: false,
          nhsNumber: "9999999111",
          given: ["Fall"],
          family: "Back"
        }],
        futurePrescriptions: [],
        pastPrescriptions: []
      })
    })

    it("should not override details return from pds even when they are missing from the returned record", async () => {
      const mockPatient: PatientSummary = {
        nhsNumber: "9999999222",
        gender: "n/a",
        dateOfBirth: "n/a",
        familyName: "n/a",
        givenName: "n/a",
        address: "n/a",
        postcode: "n/a"
      }

      const result = mapSearchResponse(mockPatient, [])

      expect(result).toEqual({
        patient: {
          nhsNumber: "9999999222",
          gender: "n/a",
          dateOfBirth: "n/a",
          familyName: "n/a",
          givenName: "n/a",
          address: "n/a",
          postcode: "n/a"
        },
        currentPrescriptions: [],
        futurePrescriptions: [],
        pastPrescriptions: []
      })
    })

    it("should correctly categorize prescriptions", () => {
      const mockPatient: PatientSummary = {
        nhsNumber: "9999999999",
        gender: PatientSummaryGender.MALE,
        dateOfBirth: "1990-01-01",
        familyName: "Doe",
        givenName: ["John"],
        address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
        postcode: "LS1 6AE"
      }

      const mockPrescriptions: Array<PrescriptionAPIResponse> = [
        {
          prescriptionId: "335C70-A83008-84058A",
          isDeleted: false,
          statusCode: "0001",
          issueDate: "20250204000000",
          prescriptionTreatmentType: TreatmentType.ACUTE,
          prescriptionPendingCancellation: false,
          itemsPendingCancellation: false,
          nhsNumber: "9999999111",
          given: ["Fall"],
          family: "Back"
        },
        {
          prescriptionId: "335C70-A83008-84058B",
          isDeleted: false,
          statusCode: "0004",
          issueDate: "20250204000000",
          prescriptionTreatmentType: TreatmentType.ACUTE,
          prescriptionPendingCancellation: false,
          itemsPendingCancellation: false,
          nhsNumber: "9999999111",
          given: ["Fall"],
          family: "Back"
        },
        {
          prescriptionId: "335C70-A83008-84058C",
          isDeleted: false,
          statusCode: "0000",
          issueDate: "20250204000000",
          prescriptionTreatmentType: TreatmentType.ACUTE,
          prescriptionPendingCancellation: false,
          itemsPendingCancellation: false,
          nhsNumber: "9999999111",
          given: ["Fall"],
          family: "Back"
        }
      ]
      const result = mapSearchResponse(mockPatient, mockPrescriptions)

      // Updated to match actual implementation
      expect(result).toEqual({
        patient: {
          nhsNumber: "9999999999",
          gender: PatientSummaryGender.MALE,
          dateOfBirth: "1990-01-01",
          familyName: "Doe",
          givenName: ["John"],
          address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
          postcode: "LS1 6AE"
        },
        currentPrescriptions: [{
          prescriptionId: "335C70-A83008-84058A",
          isDeleted: false,
          statusCode: "0001",
          issueDate: "20250204000000",
          prescriptionTreatmentType: TreatmentType.ACUTE,
          prescriptionPendingCancellation: false,
          itemsPendingCancellation: false,
          nhsNumber: "9999999111",
          given: ["Fall"],
          family: "Back"
        }],
        futurePrescriptions: [{
          prescriptionId: "335C70-A83008-84058C",
          isDeleted: false,
          statusCode: "0000",
          issueDate: "20250204000000",
          prescriptionTreatmentType: TreatmentType.ACUTE,
          prescriptionPendingCancellation: false,
          itemsPendingCancellation: false,
          nhsNumber: "9999999111",
          given: ["Fall"],
          family: "Back"
        }],
        pastPrescriptions: [{
          prescriptionId: "335C70-A83008-84058B",
          isDeleted: false,
          statusCode: "0004",
          issueDate: "20250204000000",
          prescriptionTreatmentType: TreatmentType.ACUTE,
          prescriptionPendingCancellation: false,
          itemsPendingCancellation: false,
          nhsNumber: "9999999111",
          given: ["Fall"],
          family: "Back"
        }]
      })
    })
  })

  describe("mapResponseToPrescriptionSummary", () => {
    it("should correctly parses a Bundle of prescriptions when called with search results", () => {
      const mockBundle: Bundle = {
        resourceType: "Bundle",
        type: "searchset",
        entry: [
          {
            fullUrl: "urn:uuid:PATIENT-123-567-890",
            search: {
              mode: "include"
            },
            resource: {
              resourceType: "Patient",
              identifier: [{
                system: "https://fhir.nhs.uk/Id/nhs-number",
                value: "9732730684"
              }],
              name: [{
                prefix: ["MISS"],
                suffix: ["OBE"],
                given: ["ETTA"],
                family: "CORY"
              }]
            }
          },
          {
            fullUrl: "urn:uuid:PRESCRIPTION-111-111-111",
            search: {
              mode: "match"
            },
            resource: {
              resourceType: "RequestGroup",
              identifier: [{
                system: "https://fhir.nhs.uk/Id/prescription-order-number",
                value: "335C70-A83008-111111"
              }],
              subject: {
                reference: "urn:uuid:PATIENT-123-567-890"
              },
              status: "active",
              intent: "reflex-order",
              authoredOn: "20250204000000",
              extension: [
                {
                  url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PrescriptionStatusHistory",
                  extension: [{
                    url: "status",
                    valueCoding : {
                      system: "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status",
                      code: "0001",
                      display: "To be Dispensed"
                    }
                  }]
                },
                {
                  url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation",
                  extension: [
                    {
                      url: "numberOfRepeatsIssued",
                      valueInteger: 1
                    },
                    {
                      url: "numberOfRepeatsAllowed",
                      valueInteger: 7
                    }
                  ]
                },
                {
                  url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
                  extension: [
                    {
                      url: "prescriptionPendingCancellation",
                      valueBoolean: false
                    },
                    {
                      url: "lineItemPendingCancellation",
                      valueBoolean: false
                    }
                  ]
                }
              ]
            }
          },
          {
            fullUrl: "urn:uuid:PRESCRIPTION-222-222-222",
            search: {
              mode: "match"
            },
            resource: {
              resourceType: "RequestGroup",
              identifier: [{
                system: "https://fhir.nhs.uk/Id/prescription-order-number",
                value: "335C70-A83008-222222"
              }],
              subject: {
                reference: "urn:uuid:PATIENT-123-567-890"
              },
              status: "active",
              intent: "order",
              authoredOn: "20250204000000",
              extension: [
                {
                  url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PrescriptionStatusHistory",
                  extension: [{
                    url: "status",
                    valueCoding : {
                      system: "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status",
                      code: "0006",
                      display: "Dispensed"
                    }
                  }]
                },
                {
                  url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
                  extension: [
                    {
                      url: "prescriptionPendingCancellation",
                      valueBoolean: false
                    },
                    {
                      url: "lineItemPendingCancellation",
                      valueBoolean: false
                    }
                  ]
                }
              ]
            }
          }
        ]
      }
      const result = mapResponseToPrescriptionSummary(mockBundle)

      expect(result).toEqual([
        {
          prescriptionId: "335C70-A83008-111111",
          isDeleted: false,
          statusCode: "0001",
          issueDate: "20250204000000",
          issueNumber: 1,
          maxRepeats: 7,
          prescriptionTreatmentType: TreatmentType.ERD,
          prescriptionPendingCancellation: false,
          itemsPendingCancellation: false,
          nhsNumber: "9732730684",
          given: ["ETTA"],
          family: "CORY",
          prefix: ["MISS"],
          suffix: ["OBE"]
        },
        {
          prescriptionId: "335C70-A83008-222222",
          isDeleted: false,
          statusCode: "0006",
          issueDate: "20250204000000",
          prescriptionTreatmentType: TreatmentType.ACUTE,
          prescriptionPendingCancellation: false,
          itemsPendingCancellation: false,
          nhsNumber: "9732730684",
          given: ["ETTA"],
          family: "CORY",
          prefix: ["MISS"],
          suffix: ["OBE"]
        }
      ])
    })

    it("should handle empty bundle", () => {
      const emptyBundle: Bundle = {
        resourceType: "Bundle",
        type: "searchset",
        entry: []
      }

      const result = mapResponseToPrescriptionSummary(emptyBundle)
      expect(result).toEqual([])
    })
  })

  // describe("findExtensionValue", () => {
  //   it("should find boolean extension value", () => {
  //     const extensions = [
  //       {
  //         url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
  //         extension: [
  //           {
  //             url: "prescriptionPendingCancellation",
  //             valueBoolean: false
  //           }
  //         ]
  //       }
  //     ]

  //     const result = findExtensionValue(extensions,
  //       "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation")
  //     expect(result).toBe(false)
  //   })

  //   it("should return undefined for non-existent extension", () => {
  //     const requestGroup = mockBundle.entry?.[0].resource as RequestGroup
  //     const result = findExtensionValue(requestGroup.extension, "non-existent-url")
  //     expect(result).toBeUndefined()
  //   })
  // })

  // describe("extractNhsNumber", () => {
  //   it("should extract NHS number from bundle", () => {
  //     const bundleWithPatient: Bundle = {
  //       ...mockBundle,
  //       entry: [
  //         {
  //           resource: {
  //             resourceType: "Patient",
  //             identifier: [{
  //               system: "https://fhir.nhs.uk/Id/nhs-number",
  //               value: "9999999999"
  //             }]
  //           }
  //         },
  //         ...mockBundle.entry!
  //       ]
  //     }

  //     const result = extractNhsNumber(bundleWithPatient)
  //     expect(result).toBe("9999999999")
  //   })

  //   it("should return empty string if no NHS number found", () => {
  //     const result = extractNhsNumber(mockBundle)
  //     expect(result).toBe("")
  //   })
  // })

  // describe("extractPatientNameField", () => {
  //   it("should extract given name correctly, including concatanation", () => {
  //     const bundleWithPatientName: Bundle = {
  //       resourceType: "Bundle",
  //       type: "searchset",
  //       entry: [{
  //         fullUrl: "urn:uuid:PATIENT-123-567-890",
  //         search: {
  //           mode: "include"
  //         },
  //         resource: {
  //           resourceType: "Patient",
  //           identifier: [{
  //             system: "https://fhir.nhs.uk/Id/nhs-number",
  //             value: "9732730684"
  //           }],
  //           name: [{
  //             prefix: ["MISS"],
  //             suffix: ["OBE"],
  //             given: ["ETTA", "LOUISE"],
  //             family: "CORY"
  //           }]
  //         } satisfies Patient
  //       }]
  //     }

  //     const result = extractPatientNameField(bundleWithPatientName, "given")
  //     expect(result).toBe("ETTA LOUISE")
  //   })

  //   it("should return empty string if given name is not found", () => {
  //     const bundleWithoutGivenName: Bundle = {
  //       resourceType: "Bundle",
  //       type: "searchset",
  //       entry: [{
  //         fullUrl: "urn:uuid:PATIENT-123-567-890",
  //         resource: {
  //           resourceType: "Patient",
  //           name: [{
  //             family: "CORY"
  //           }]
  //         } satisfies Patient
  //       }]
  //     }

  //     const result = extractPatientNameField(bundleWithoutGivenName, "given")
  //     expect(result).toBe("")
  //   })

  //   it("should return empty string if patient resource is missing", () => {
  //     const bundleWithoutPatientResource: Bundle = {
  //       resourceType: "Bundle",
  //       type: "searchset",
  //       entry: []
  //     }

  //     const result = extractPatientNameField(bundleWithoutPatientResource, "given")
  //     expect(result).toBe("")
  //   })

  //   it("should return empty string if name array is empty", () => {
  //     const bundleWithEmptyNameArray: Bundle = {
  //       resourceType: "Bundle",
  //       type: "searchset",
  //       entry: [{
  //         fullUrl: "urn:uuid:PATIENT-123-567-890",
  //         resource: {
  //           resourceType: "Patient",
  //           name: []
  //         } satisfies Patient
  //       }]
  //     }

  //     const result = extractPatientNameField(bundleWithEmptyNameArray, "given")
  //     expect(result).toBe("")
  //   })
  // })

  // describe("Fallback Logic Tests", () => {
  // //   it("should use fallback when PDS data is incomplete", () => {
  // //     // Create incomplete PDS response with _pdsError flag
  // //     const incompletePdsDetails = {
  // //       ...createMinimalPatientSummary(),
  // //       nhsNumber: "9999999999",
  // //       family: "Doe",
  // //       _pdsError: new Error("Test PDS error")
  // //     }

  //   //     // Using actual implementation which uses nhsNumber for fallback
  //   //     const prescriptions = [{
  //   //       prescriptionId: "335C70-A83008-84058A",
  //   //       isDeleted: false,
  //   //       statusCode: "0001",
  //   //       issueDate: "20250204000000",
  //   //       prescriptionTreatmentType: TreatmentType.ACUTE,
  //   //       prescriptionPendingCancellation: false,
  //   //       itemsPendingCancellation: false,
  //   //       nhsNumber: 9876543210
  //   //     }]

  //   //     // Test the search response with fallback
  //   //     const result = mapSearchResponse(incompletePdsDetails, prescriptions)

  //   //     // Should use nhsNumber from prescription for fallback
  //   //     expect(result.patient).toMatchObject({
  //   //       nhsNumber: "9876543210", // From fallback
  //   //       given: "", // From fallback (uses nhsNumber as given)
  //   //       family: "", // Default value in fallback
  //   //       prefix: "",
  //   //       suffix: ""
  //   //     })
  //   //   })

  //   //   it("should prefer PDS data when available over fallback", () => {
  //   //     // Create complete PDS response
  //   //     const completePdsDetails = {
  //   //       nhsNumber: "9999999999",
  //   //       given: "John",
  //   //       family: "Doe",
  //   //       prefix: "Mr",
  //   //       suffix: "Jr",
  //   //       gender: "male",
  //   //       dateOfBirth: "1990-01-01",
  //   //       address: null
  //   //     }

  //   //     const prescriptions = [{
  //   //       prescriptionId: "335C70-A83008-84058A",
  //   //       isDeleted: false,
  //   //       statusCode: "0001",
  //   //       issueDate: "20250204000000",
  //   //       prescriptionTreatmentType: TreatmentType.ACUTE,
  //   //       prescriptionPendingCancellation: false,
  //   //       itemsPendingCancellation: false,
  //   //       nhsNumber: 9876543210
  //   //     }]

  //   //     const result = mapSearchResponse(completePdsDetails, prescriptions)

  //   //     // Should use PDS data
  //   //     expect(result.patient).toMatchObject({
  //   //       nhsNumber: "9999999999", // From PDS
  //   //       given: "John", // From PDS
  //   //       family: "Doe", // From PDS
  //   //       prefix: "Mr", // From PDS
  //   //       suffix: "Jr" // From PDS
  //   //     })
  //   //   })

  //   it("should handle missing patient resource in bundle for fallback", () => {
  //     // Create incomplete PDS data with _pdsError
  //     // const incompletePdsDetails = {
  //     //   undefined,
  //     //   _pdsError: new Error("Test PDS error")
  //     // }

  //     // Create prescription with nhsNumber
  //     const prescriptions = [{
  //       prescriptionId: "335C70-A83008-84058A",
  //       isDeleted: false,
  //       statusCode: "0001",
  //       issueDate: "20250204000000",
  //       prescriptionTreatmentType: TreatmentType.ACUTE,
  //       prescriptionPendingCancellation: false,
  //       itemsPendingCancellation: false,
  //       nhsNumber: "0" // No NHS Number
  //     }]

  //     const result = mapSearchResponse(undefined, prescriptions)

  //     // Should have default values when no fallback available
  //     expect(result.patient).toEqual({
  //       nhsNumber: "0", // From prescription nhsNumber converted to string
  //       given: "",
  //       family: ""
  //     })
  //   })

  //   it("should handle completely missing data in all sources", () => {
  //     // Prescription with NHS Number
  //     const prescriptions = [{
  //       prescriptionId: "335C70-A83008-84058A",
  //       isDeleted: false,
  //       statusCode: "0001",
  //       issueDate: "20250204000000",
  //       prescriptionTreatmentType: TreatmentType.ACUTE,
  //       prescriptionPendingCancellation: false,
  //       itemsPendingCancellation: false,
  //       nhsNumber: "9876543210"
  //     }]

  //     const result = mapSearchResponse(undefined, prescriptions)
  //     expect(result.patient).toEqual({
  //       nhsNumber: "9876543210"//,
  //     })
  //   })
  // })
})
