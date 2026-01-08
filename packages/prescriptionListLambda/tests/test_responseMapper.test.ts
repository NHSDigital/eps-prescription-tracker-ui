import {describe, expect, it} from "@jest/globals"
import {mapSearchResponse, mapResponseToPrescriptionSummary} from "../src/utils/responseMapper"
import {Bundle} from "fhir/r4"
import {
  PatientAddressUse,
  PatientNameUse,
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
        nameUse: PatientNameUse.USUAL,
        address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
        postcode: "LS1 6AE",
        addressUse: PatientAddressUse.HOME
      }

      const result = mapSearchResponse(mockPatient, [])

      expect(result).toEqual({
        patient: {
          nhsNumber: "9999999999",
          gender: PatientSummaryGender.MALE,
          dateOfBirth: "1990-01-01",
          familyName: "Doe",
          givenName: ["John"],
          nameUse: PatientNameUse.USUAL,
          address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
          postcode: "LS1 6AE",
          addressUse: PatientAddressUse.HOME
        },
        patientFallback: false,
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
        patientFallback: true,
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
        nameUse: "n/a",
        address: "n/a",
        postcode: "n/a",
        addressUse: "n/a"
      }

      const result = mapSearchResponse(mockPatient, [])

      expect(result).toEqual({
        patient: {
          nhsNumber: "9999999222",
          gender: "n/a",
          dateOfBirth: "n/a",
          familyName: "n/a",
          givenName: "n/a",
          nameUse: "n/a",
          address: "n/a",
          postcode: "n/a",
          addressUse: "n/a"
        },
        patientFallback: false,
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
        nameUse: PatientNameUse.USUAL,
        address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
        postcode: "LS1 6AE",
        addressUse: PatientAddressUse.HOME
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
          nameUse: PatientNameUse.USUAL,
          address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
          postcode: "LS1 6AE",
          addressUse: PatientAddressUse.HOME
        },
        patientFallback: false,
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
})
