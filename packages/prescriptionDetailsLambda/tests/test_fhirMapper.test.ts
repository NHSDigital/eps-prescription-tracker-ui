import {MedicationDispense, MedicationRequest, Patient} from "fhir/r4"
import {
  extractPatientDetails,
  mapMessageHistoryTitleToMessageCode,
  mapPrescriptionOrigin,
  extractItems
} from "../src/utils/fhirMappers"

describe("mapMessageHistoryTitleToMessageCode", () => {
  it("should map common message titles correctly", () => {
    expect(mapMessageHistoryTitleToMessageCode("Prescription upload successful")).toBe("prescription-uploaded")
    expect(mapMessageHistoryTitleToMessageCode("Release Request successful")).toBe("release-requested")
    expect(mapMessageHistoryTitleToMessageCode("Dispense notification successful")).toBe("dispense-notified")
  })

  it("should return undefined for unrecognized message titles", () => {
    expect(mapMessageHistoryTitleToMessageCode("Unknown Message")).toBeUndefined()
    expect(mapMessageHistoryTitleToMessageCode("")).toBeUndefined()
  })

  it("should handle undefined message titles gracefully", () => {
    expect(mapMessageHistoryTitleToMessageCode("")).toBeUndefined()
  })
})

describe("mapPrescriptionOrigin", () => {
  it("should identify England origins with '01' prefix", () => {
    expect(mapPrescriptionOrigin("01")).toBe("England")
    expect(mapPrescriptionOrigin("0123")).toBe("England")
  })

  it("should identify England origins with '1' prefix", () => {
    expect(mapPrescriptionOrigin("1")).toBe("England")
    expect(mapPrescriptionOrigin("123")).toBe("England")
  })

  it("should identify Wales origins with '02' prefix", () => {
    expect(mapPrescriptionOrigin("02")).toBe("Wales")
    expect(mapPrescriptionOrigin("0234")).toBe("Wales")
  })

  it("should identify Wales origins with '2' prefix", () => {
    expect(mapPrescriptionOrigin("2")).toBe("Wales")
    expect(mapPrescriptionOrigin("234")).toBe("Wales")
  })

  it("should return 'Unknown' for other code formats", () => {
    expect(mapPrescriptionOrigin("03")).toBe("Unknown")
    expect(mapPrescriptionOrigin("3")).toBe("Unknown")
    expect(mapPrescriptionOrigin("")).toBe("Unknown")
  })

  it("should handle undefined typeCode gracefully", () => {
    expect(mapPrescriptionOrigin("")).toBe("Unknown")
  })
})

describe("extractPatientDetails", () => {
  it("should extract complete patient details", () => {
    const patient: Patient = {
      resourceType: "Patient",
      identifier: [{value: "1234567890"}],
      name: [{
        prefix: ["Mr."],
        given: ["John", "Q."],
        family: "Doe",
        suffix: ["Jr."]
      }],
      gender: "male",
      birthDate: "1980-01-15",
      address: [{
        line: ["123 Main St", "Apt 4B"],
        city: "Anytown",
        postalCode: "12345",
        text: "123 Main St, Apt 4B, Anytown, 12345"
      }]
    }

    const result = extractPatientDetails(patient)
    expect(result).toEqual({
      nhsNumber: "1234567890",
      prefix: "Mr.",
      suffix: "Jr.",
      given: "John Q.",
      family: "Doe",
      gender: "male",
      dateOfBirth: "1980-01-15",
      address: "123 Main St, Apt 4B, Anytown, 12345"
    })
  })

  it("should handle minimal patient data", () => {
    const patient: Patient = {
      resourceType: "Patient",
      identifier: [{value: "1234567890"}],
      name: [{family: "Doe"}]
    }

    const result = extractPatientDetails(patient)
    expect(result).toEqual({
      nhsNumber: "1234567890",
      prefix: "",
      suffix: "",
      given: "Unknown",
      family: "Doe",
      gender: null,
      dateOfBirth: null,
      address: "Not Found"
    })
  })

  it("should handle patient with missing address", () => {
    const patient: Patient = {
      resourceType: "Patient",
      identifier: [{value: "1234567890"}],
      name: [{family: "Doe", given: ["John"]}],
      gender: "male"
    }

    const result = extractPatientDetails(patient)
    expect(result.address).toBe("Not Found")
  })

  it("should join multiple given names", () => {
    const patient: Patient = {
      resourceType: "Patient",
      name: [{given: ["John", "James", "Jacob"]}]
    }

    const result = extractPatientDetails(patient)
    expect(result.given).toBe("John James Jacob")
  })
})

describe("extractPrescribedItems", () => {
  it("should extract details from medication requests", () => {
    const medicationRequests: Array<MedicationRequest> = [
      {
        resourceType: "MedicationRequest",
        medicationCodeableConcept: {text: "Medication A"},
        dispenseRequest: {quantity: {value: 30}},
        dosageInstruction: [{text: "Take once daily"}],
        status: "active",
        intent: "order",
        subject: {}
      }
    ]

    const result = extractItems(medicationRequests, [])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      medicationName: "Medication A",
      quantity: "30",
      dosageInstructions: "Take once daily",
      epsStatusCode: "unknown",
      nhsAppStatus: undefined,
      itemPendingCancellation: false,
      cancellationReason: undefined,
      notDispensedReason: undefined
    })
  })

  it("should handle empty medication requests array", () => {
    const result = extractItems([], [])
    expect(result).toEqual([])
  })

  it("should handle medication requests with missing properties", () => {
    const medicationRequests: Array<MedicationRequest> = [
      {
        resourceType: "MedicationRequest",
        status: "active",
        intent: "order",
        subject: {}
      }
    ]

    const result = extractItems(medicationRequests, [])
    expect(result[0]).toEqual({
      medicationName: "Unknown",
      quantity: "Unknown",
      dosageInstructions: undefined,
      epsStatusCode: "unknown",
      nhsAppStatus: undefined,
      itemPendingCancellation: false,
      cancellationReason: undefined,
      notDispensedReason: undefined
    })
  })

  it("should extract pending cancellation status from extensions", () => {
    const medicationRequests: Array<MedicationRequest> = [
      {
        resourceType: "MedicationRequest",
        status: "active",
        intent: "order",
        subject: {},
        extension: [
          {
            url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
            extension: [
              {url: "lineItemPendingCancellation", valueBoolean: true}
            ]
          }
        ]
      }
    ]

    const result = extractItems(medicationRequests, [])
    expect(result[0].itemPendingCancellation).toBe(true)
  })

  it("should extract the cancellation reason when present", () => {
    const medicationRequests: Array<MedicationRequest> = [
      {
        resourceType: "MedicationRequest",
        status: "active",
        intent: "order",
        subject: {},
        statusReason: {
          coding: [{
            system: "https://fhir.nhs.uk/CodeSystem/medicationrequest-status-reason",
            code: "0001",
            display: "Prescribing Error"
          }]
        },
        extension: [
        ]
      }
    ]
    const result = extractItems(medicationRequests, [])
    expect(result[0].cancellationReason).toBe("0001")
  })

  it("should extract the non-dispensing reason when present", () => {
    const medicationRequests: Array<MedicationRequest> = [{
      resourceType: "MedicationRequest",
      id: "MED-REQ-1234",
      status: "active",
      intent: "order",
      subject: {},
      extension: [
      ]
    }]
    const medicationDispenses: Array<MedicationDispense> = [{
      resourceType: "MedicationDispense",
      id: "MED-DIS-1234",
      status: "in-progress",
      statusReasonCodeableConcept: {
        coding: [{
          system: "https://fhir.nhs.uk/CodeSystem/medicationdispense-status-reason",
          code: "0002",
          display: "Clinically unsuitable"
        }]
      },
      authorizingPrescription: [{
        reference: "urn:uuid:MED-REQ-1234"
      }]
    }]
    const result = extractItems(medicationRequests, medicationDispenses)
    expect(result[0].notDispensedReason).toBe("0002")
  })

  it("should extract dispensing status from extensions", () => {
    const medicationRequests: Array<MedicationRequest> = [
      {
        resourceType: "MedicationRequest",
        status: "completed",
        intent: "order",
        subject: {},
        extension: [
          {
            url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-DispensingInformation",
            extension: [
              {url: "dispenseStatus", valueCoding: {code: "0001", display: "Dispensed"}}
            ]
          }
        ]
      }
    ]

    const result = extractItems(medicationRequests, [])
    expect(result[0].epsStatusCode).toBe("0001")
  })
})
