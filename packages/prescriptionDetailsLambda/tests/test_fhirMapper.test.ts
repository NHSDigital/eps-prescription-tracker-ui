import {MedicationDispense, MedicationRequest} from "fhir/r4"
import {mapMessageHistoryTitleToMessageCode, mapPrescriptionOrigin, extractItems} from "../src/utils/fhirMappers"

describe("mapMessageHistoryTitleToMessageCode", () => {
  it("should map common message titles correctly", () => {
    expect(mapMessageHistoryTitleToMessageCode("Prescription upload successful")).toBe("prescription-uploaded")
    expect(mapMessageHistoryTitleToMessageCode("Release Request successful")).toBe("release-requested")
    expect(mapMessageHistoryTitleToMessageCode("Dispense notification successful")).toBe("dispense-notified")
    expect(
      mapMessageHistoryTitleToMessageCode(
        "Prescription/item was not cancelled. With dispenser active. Marked for cancellation"
      )
    ).toBe("prescription-marked-for-cancellation")
  })

  it("should return undefined for unrecognized message titles", () => {
    expect(mapMessageHistoryTitleToMessageCode("Unknown Message")).toBe("Unknown Message")
    expect(mapMessageHistoryTitleToMessageCode("")).toBe("")
  })

  it("should handle undefined message titles gracefully", () => {
    expect(mapMessageHistoryTitleToMessageCode("")).toBe("")
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
      pharmacyStatus: undefined,
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
      pharmacyStatus: undefined,
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

  it("should extract pharmacyStatus from DM prescription status update extension", () => {
    const medicationRequests: Array<MedicationRequest> = [
      {
        resourceType: "MedicationRequest",
        status: "active",
        intent: "order",
        subject: {},
        extension: [
          {
            url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionStatusHistory",
            extension: [
              {url: "status", valueCoding: {code: "Dispatched"}}
            ]
          }
        ]
      }
    ]
    const result = extractItems(medicationRequests, [])
    expect(result[0].pharmacyStatus).toBe("Dispatched")
  })

  it("should return undefined pharmacyStatus if DM extension is missing", () => {
    const medicationRequests: Array<MedicationRequest> = [
      {
        resourceType: "MedicationRequest",
        status: "active",
        intent: "order",
        subject: {},
        extension: []
      }
    ]

    const result = extractItems(medicationRequests, [])
    expect(result[0].pharmacyStatus).toBeUndefined()
  })
})
