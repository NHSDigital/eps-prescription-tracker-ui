import {jest} from "@jest/globals"

import {RequestGroup} from "fhir/r4"
import {DoHSData} from "../src/utils/types"

import {mergePrescriptionDetails} from "../src/utils/responseMapper"

// Stub out the mapper function so we can verify the mapped value
jest.mock("../src/utils/fhirMappers", () => ({
  mapIntentToPrescriptionTreatmentType: jest.fn((intent: string) => `mapped-${intent}`)
}))

describe("mergePrescriptionDetails", () => {
  it("should throw an error when prescription details are null", () => {
    expect(() => mergePrescriptionDetails(null)).toThrow("Prescription details not found")
  })

  it("should merge full prescription details and DoHS data correctly", () => {
    const prescriptionDetails: RequestGroup = {
      resourceType: "RequestGroup",
      intent: "order",
      status: "draft",
      identifier: [{value: "RX123"}],
      authoredOn: "2020-01-01T00:00:00Z",
      extension: [
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType",
          valueCoding: {code: "01"}
        },
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation",
          extension: [
            {url: "numberOfRepeatsIssued", valueInteger: 2},
            {url: "numberOfRepeatsAllowed", valueInteger: 5}
          ]
        },
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PendingCancellations",
          extension: [
            {url: "prescriptionPendingCancellation", valueBoolean: true}
          ]
        }
      ],
      contained: [
        {
          resourceType: "Patient",
          identifier: [{value: "P123"}],
          name: [{prefix: ["Mr."], given: ["John"], family: "Doe", suffix: ["Jr."]}],
          gender: "male",
          birthDate: "1980-01-01",
          address: [{
            text: "123 Main St",
            line: ["123 Main St"],
            city: "Anytown",
            district: "AnyDistrict",
            postalCode: "12345",
            type: "physical",
            use: "home"
          }]
        },
        {
          resourceType: "MedicationRequest",
          medicationCodeableConcept: {coding: [{display: "Drug A"}]},
          dispenseRequest: {quantity: {value: 30}},
          dosageInstruction: [{text: "Take one daily"}],
          status: "active",
          intent: "order",
          subject: {},
          extension: [
            {
              url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PendingCancellations",
              extension: [
                {url: "lineItemPendingCancellation", valueBoolean: false},
                {url: "cancellationReason", valueCoding: {display: "None"}}
              ]
            }
          ]
        },
        {
          resourceType: "MedicationDispense",
          medicationCodeableConcept: {coding: [{display: "Drug B"}]},
          quantity: {value: 20},
          dosageInstruction: [{text: "Take two daily"}],
          status: "completed",
          extension: [
            {
              url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionNonDispensingReason",
              valueCoding: {display: "Not available"}
            }
          ]
        }
      ],
      action: [
        {
          action: [
            {
              code: [{coding: [{code: "MSG001", display: "Sent"}]}],
              timingDateTime: "2020-01-02T00:00:00Z"
            }
          ]
        }
      ]
    }

    const doHSData: DoHSData = {
      prescribingOrganization: {
        OrganisationName: "Prescriber Org",
        ODSCode: "ODS123",
        Address1: "1 Prescriber Rd",
        City: "Presc City",
        Postcode: "PC123",
        Contacts: [
          {
            ContactMethodType: "Telephone",
            ContactValue: "0123456789",
            ContactAvailabilityType: "9-5",
            ContactType: "home"
          }
        ]
      },
      nominatedPerformer: {
        OrganisationName: "Nominated Performer Org",
        ODSCode: "ODS456",
        Address1: "2 Performer Rd",
        City: "Perform City",
        Postcode: "PC456",
        Contacts: [
          {
            ContactMethodType: "Telephone",
            ContactValue: "0987654321",
            ContactAvailabilityType: "9-5",
            ContactType: "home"
          }
        ]
      },
      dispensingOrganization: {
        OrganisationName: "Dispensing Org",
        ODSCode: "ODS789",
        Address1: "3 Dispense Rd",
        City: "Dispense City",
        Postcode: "PC789",
        Contacts: [
          {
            ContactMethodType: "Telephone",
            ContactValue: "1112223333",
            ContactAvailabilityType: "9-5",
            ContactType: "home"
          }
        ]
      }
    }

    const result = mergePrescriptionDetails(prescriptionDetails, doHSData)

    // Check patient details
    expect(result.patientDetails).toEqual({
      identifier: "P123",
      name: {prefix: "Mr.", given: "John", family: "Doe", suffix: "Jr."},
      gender: "male",
      birthDate: "1980-01-01",
      address: {
        text: "123 Main St",
        line: "123 Main St",
        city: "Anytown",
        district: "AnyDistrict",
        postalCode: "12345",
        type: "physical",
        use: "home"
      }
    })

    expect(result.prescriptionID).toBe("RX123")
    expect(result.typeCode).toBe("01")
    expect(result.statusCode).toBe("Acute")
    expect(result.issueDate).toBe("2020-01-01T00:00:00Z")
    expect(result.instanceNumber).toBe(2)
    expect(result.maxRepeats).toBe(5)
    expect(result.daysSupply).toBe("Not found")
    expect(result.prescriptionPendingCancellation).toBe(true)

    // Check prescribed items
    expect(result.prescribedItems).toHaveLength(1)
    expect(result.prescribedItems[0].itemDetails).toEqual({
      medicationName: "Drug A",
      quantity: "30",
      dosageInstructions: "Take one daily",
      epsStatusCode: "active",
      nhsAppStatus: "Optional - Not available",
      itemPendingCancellation: false,
      cancellationReason: "None"
    })

    // Check dispensed items
    expect(result.dispensedItems).toHaveLength(1)
    expect(result.dispensedItems[0].itemDetails).toEqual({
      medicationName: "Drug B",
      quantity: "20",
      dosageInstructions: "Take two daily",
      epsStatusCode: "completed",
      nhsAppStatus: "Optional - Not available",
      itemPendingCancellation: false,
      cancellationReason: null,
      notDispensedReason: "Not available",
      initiallyPrescribed: {
        medicationName: "Drug B",
        quantity: "20",
        dosageInstructions: "Take two daily"
      }
    })

    // Check message history
    expect(result.messageHistory).toHaveLength(1)
    expect(result.messageHistory[0]).toEqual({
      messageCode: "MSG001",
      sentDateTime: "2020-01-02T00:00:00Z",
      organisationName: "Nominated Performer Org",
      organisationODS: "ODS456",
      newStatusCode: "Sent",
      dispenseNotification: []
    })

    // Check prescriber organisation
    expect(result.prescriberOrganisation).toEqual({
      organisationSummaryObjective: {
        name: "Prescriber Org",
        odsCode: "ODS123",
        address: "1 Prescriber Rd Presc City PC123",
        telephone: "0123456789",
        prescribedFrom: "England"
      }
    })

    // Check nominated dispenser
    expect(result.nominatedDispenser).toEqual({
      organisationSummaryObjective: {
        name: "Nominated Performer Org",
        odsCode: "ODS456",
        address: "2 Performer Rd Perform City PC456",
        telephone: "0987654321"
      }
    })

    // Check current dispenser
    expect(result.currentDispenser).toEqual({
      organisationSummaryObjective: {
        name: "Dispensing Org",
        odsCode: "ODS789",
        address: "3 Dispense Rd Dispense City PC789",
        telephone: "1112223333"
      }
    })
  })

  it('should default patient details to "Not found" when no patient is contained', () => {
    const prescriptionDetails: RequestGroup = {
      resourceType: "RequestGroup",
      intent: "order",
      status: "active",
      contained: [] // No contained patient resource
    }

    const result = mergePrescriptionDetails(prescriptionDetails)
    expect(result.patientDetails).toEqual({
      identifier: "Not found",
      name: {prefix: "", given: "Not found", family: "Not found", suffix: ""},
      gender: "Not found",
      birthDate: "Not found",
      address: {
        text: "Not found",
        line: "Not found",
        city: "Not found",
        district: "Not found",
        postalCode: "Not found",
        type: "Not found",
        use: "Not found"
      }
    })
  })

  it("should handle missing MedicationRequest and MedicationDispense resources gracefully", () => {
    const prescriptionDetails: RequestGroup = {
      resourceType: "RequestGroup",
      intent: "order",
      status: "active",
      contained: [
        // Contains only a Patient resource
        {
          resourceType: "Patient",
          identifier: [{value: "P123"}],
          name: [{prefix: ["Ms."], given: ["Jane"], family: "Doe", suffix: []}],
          gender: "female",
          birthDate: "1990-05-05",
          address: [{
            text: "456 Other St",
            line: ["456 Other St"],
            city: "Othertown",
            district: "OtherDistrict",
            postalCode: "67890",
            type: "physical",
            use: "home"
          }]
        }
      ]
    }

    const result = mergePrescriptionDetails(prescriptionDetails)
    expect(result.prescribedItems).toEqual([])
    expect(result.dispensedItems).toEqual([])
    expect(result.messageHistory).toEqual([])
  })
})
