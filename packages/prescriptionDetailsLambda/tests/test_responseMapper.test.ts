import {jest} from "@jest/globals"

import {
  MedicationDispense,
  MedicationRequest,
  Patient,
  RequestGroup
} from "fhir/r4"
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

  it("should default missing extensions to default values", () => {
    const prescriptionDetails: RequestGroup = {
      resourceType: "RequestGroup",
      intent: "order",
      status: "active",
      identifier: [{value: "RX999"}],
      authoredOn: "2021-01-01T00:00:00Z",
      contained: []
    }

    const result = mergePrescriptionDetails(prescriptionDetails)

    expect(result.typeCode).toBe("Not found")
    expect(result.instanceNumber).toBe("Not found")
    expect(result.maxRepeats).toBe("Not found")
    expect(result.prescriptionPendingCancellation).toBe(false)
  })

  it("should use the first patient when multiple patient resources are contained", () => {
    const patient1: Patient = {
      resourceType: "Patient",
      identifier: [{value: "P111"}],
      name: [{prefix: ["Dr."], given: ["Alice"], family: "Smith", suffix: ["PhD"]}],
      gender: "female",
      birthDate: "1975-07-07",
      address: [{
        text: "789 First St",
        line: ["789 First St"],
        city: "CityOne",
        district: "DistrictOne",
        postalCode: "11111",
        type: "physical",
        use: "home"
      }]
    }
    const patient2: Patient = {
      resourceType: "Patient",
      identifier: [{value: "P222"}],
      name: [{prefix: ["Mr."], given: ["Bob"], family: "Jones", suffix: []}],
      gender: "male",
      birthDate: "1985-08-08",
      address: [{
        text: "101 Second St",
        line: ["101 Second St"],
        city: "CityTwo",
        district: "DistrictTwo",
        postalCode: "22222",
        type: "physical",
        use: "home"
      }]
    }

    const prescriptionDetails: RequestGroup = {
      resourceType: "RequestGroup",
      intent: "order",
      status: "active",
      contained: [patient1, patient2]
    }

    const result = mergePrescriptionDetails(prescriptionDetails)

    // Should use patient1 details
    expect(result.patientDetails).toEqual({
      identifier: "P111",
      name: {prefix: "Dr.", given: "Alice", family: "Smith", suffix: "PhD"},
      gender: "female",
      birthDate: "1975-07-07",
      address: {
        text: "789 First St",
        line: "789 First St",
        city: "CityOne",
        district: "DistrictOne",
        postalCode: "11111",
        type: "physical",
        use: "home"
      }
    })
  })

  it("should correctly map nested dispense notifications in message history", () => {
    const prescriptionDetails: RequestGroup = {
      resourceType: "RequestGroup",
      intent: "order",
      status: "active",
      identifier: [{value: "RX555"}],
      authoredOn: "2022-02-02T00:00:00Z",
      contained: [],
      action: [
        {
          action: [
            {
              code: [{coding: [{code: "MSG002", display: "Dispatched"}]}],
              timingDateTime: "2022-02-03T00:00:00Z",
              action: [
                {
                  resource: {reference: "Dispense/123"}
                },
                {
                  resource: {reference: "Dispense/456"}
                }
              ]
            }
          ]
        }
      ]
    }

    const doHSData = {
      nominatedPerformer: {
        OrganisationName: "Nominated Org",
        ODSCode: "ODS000",
        Address1: "10 Dispense St",
        City: "DispCity",
        Postcode: "D123",
        Contacts: [
          {
            ContactMethodType: "Telephone",
            ContactValue: "555-1234",
            ContactAvailabilityType: "24/7",
            ContactType: "work"
          }
        ]
      }
    }

    const result = mergePrescriptionDetails(prescriptionDetails, doHSData)

    expect(result.messageHistory).toHaveLength(1)
    expect(result.messageHistory[0]).toEqual({
      messageCode: "MSG002",
      sentDateTime: "2022-02-03T00:00:00Z",
      organisationName: "Nominated Org",
      organisationODS: "ODS000",
      newStatusCode: "Dispatched",
      dispenseNotification: [
        {
          ID: "Dispense/123",
          medicationName: "Not found",
          quantity: "Not found",
          dosageInstruction: "Not found"
        },
        {
          ID: "Dispense/456",
          medicationName: "Not found",
          quantity: "Not found",
          dosageInstruction: "Not found"
        }
      ]
    })
  })

  it("should handle partial doHSData object gracefully", () => {
    const prescriptionDetails: RequestGroup = {
      resourceType: "RequestGroup",
      intent: "order",
      status: "active",
      identifier: [{value: "RX777"}],
      authoredOn: "2023-03-03T00:00:00Z",
      contained: []
    }

    const partialDoHSData = {
      prescribingOrganization: {
        OrganisationName: "Only Prescriber Org",
        ODSCode: "ODS111",
        Address1: "1 Only Rd",
        City: "Solo City",
        Postcode: "SC111",
        Contacts: [
          {
            ContactMethodType: "Telephone",
            ContactValue: "111-222-3333",
            ContactAvailabilityType: "9-5",
            ContactType: "office"
          }
        ]
      }
      // nominatedPerformer and dispensingOrganization are missing
    }

    const result = mergePrescriptionDetails(prescriptionDetails, partialDoHSData)

    expect(result.prescriberOrganisation).toEqual({
      organisationSummaryObjective: {
        name: "Only Prescriber Org",
        odsCode: "ODS111",
        address: "1 Only Rd Solo City SC111",
        telephone: "111-222-3333",
        prescribedFrom: "Unknown"
      }
    })
    expect(result.nominatedDispenser).toBeUndefined()
    expect(result.currentDispenser).toBeUndefined()
  })

  it("should correctly process multiple MedicationRequest and MedicationDispense resources", () => {
    const medRequest1: MedicationRequest = {
      resourceType: "MedicationRequest",
      medicationCodeableConcept: {coding: [{display: "Drug X"}]},
      dispenseRequest: {quantity: {value: 10}},
      dosageInstruction: [{text: "Once daily"}],
      status: "active",
      intent: "order",
      subject: {},
      extension: [
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PendingCancellations",
          extension: [
            {url: "lineItemPendingCancellation", valueBoolean: true},
            {url: "cancellationReason", valueCoding: {display: "Reason X"}}
          ]
        }
      ]
    }
    const medRequest2: MedicationRequest = {
      resourceType: "MedicationRequest",
      medicationCodeableConcept: {coding: [{display: "Drug Y"}]},
      dispenseRequest: {quantity: {value: 20}},
      dosageInstruction: [{text: "Twice daily"}],
      status: "completed",
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
    }
    const medDispense1: MedicationDispense = {
      resourceType: "MedicationDispense",
      medicationCodeableConcept: {coding: [{display: "Drug Z"}]},
      quantity: {value: 15},
      dosageInstruction: [{text: "Three times daily"}],
      status: "completed",
      extension: [
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionNonDispensingReason",
          valueCoding: {display: "Not available"}
        }
      ]
    }
    const medDispense2: MedicationDispense = {
      resourceType: "MedicationDispense",
      medicationCodeableConcept: {coding: [{display: "Drug W"}]},
      quantity: {value: 25},
      dosageInstruction: [{text: "Four times daily"}],
      status: "in-progress",
      extension: [
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionNonDispensingReason",
          valueCoding: {display: "Unavailable"}
        }
      ]
    }

    const prescriptionDetails: RequestGroup = {
      resourceType: "RequestGroup",
      intent: "order",
      status: "active",
      identifier: [{value: "RX888"}],
      authoredOn: "2023-04-04T00:00:00Z",
      contained: [medRequest1, medRequest2, medDispense1, medDispense2]
    }

    const result = mergePrescriptionDetails(prescriptionDetails)

    expect(result.prescribedItems).toHaveLength(2)
    expect(result.prescribedItems[0].itemDetails).toEqual({
      medicationName: "Drug X",
      quantity: "10",
      dosageInstructions: "Once daily",
      epsStatusCode: "active",
      nhsAppStatus: "Optional - Not available",
      itemPendingCancellation: true,
      cancellationReason: "Reason X"
    })
    expect(result.prescribedItems[1].itemDetails).toEqual({
      medicationName: "Drug Y",
      quantity: "20",
      dosageInstructions: "Twice daily",
      epsStatusCode: "completed",
      nhsAppStatus: "Optional - Not available",
      itemPendingCancellation: false,
      cancellationReason: "None"
    })

    expect(result.dispensedItems).toHaveLength(2)
    expect(result.dispensedItems[0].itemDetails).toEqual({
      medicationName: "Drug Z",
      quantity: "15",
      dosageInstructions: "Three times daily",
      epsStatusCode: "completed",
      nhsAppStatus: "Optional - Not available",
      itemPendingCancellation: false,
      cancellationReason: null,
      notDispensedReason: "Not available",
      initiallyPrescribed: {
        medicationName: "Drug Z",
        quantity: "15",
        dosageInstructions: "Three times daily"
      }
    })
    expect(result.dispensedItems[1].itemDetails).toEqual({
      medicationName: "Drug W",
      quantity: "25",
      dosageInstructions: "Four times daily",
      epsStatusCode: "in-progress",
      nhsAppStatus: "Optional - Not available",
      itemPendingCancellation: false,
      cancellationReason: null,
      notDispensedReason: "Unavailable",
      initiallyPrescribed: {
        medicationName: "Drug W",
        quantity: "25",
        dosageInstructions: "Four times daily"
      }
    })
  })

  it("should handle different typeCode values for prescriber organisation mapping", () => {
    // Test with typeCode "02" for Wales
    const prescriptionDetailsWales: RequestGroup = {
      resourceType: "RequestGroup",
      intent: "order",
      status: "active",
      identifier: [{value: "RXWales"}],
      authoredOn: "2023-05-05T00:00:00Z",
      extension: [
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType",
          valueCoding: {code: "02"}
        }
      ],
      contained: []
    }

    const doHSDataWales = {
      prescribingOrganization: {
        OrganisationName: "Prescriber Wales",
        ODSCode: "ODSWales",
        Address1: "Wales Rd",
        City: "Cardiff",
        Postcode: "CF10",
        Contacts: [
          {
            ContactMethodType: "Telephone",
            ContactValue: "020-1234",
            ContactAvailabilityType: "9-5",
            ContactType: "office"
          }
        ]
      }
    }

    const resultWales = mergePrescriptionDetails(prescriptionDetailsWales, doHSDataWales)
    expect(resultWales.prescriberOrganisation.organisationSummaryObjective.prescribedFrom).toBe("Wales")

    // Test with typeCode "03" should yield "Unknown"
    const prescriptionDetailsUnknown: RequestGroup = {
      resourceType: "RequestGroup",
      intent: "order",
      status: "active",
      identifier: [{value: "RXUnknown"}],
      authoredOn: "2023-06-06T00:00:00Z",
      extension: [
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType",
          valueCoding: {code: "03"}
        }
      ],
      contained: []
    }

    const doHSDataUnknown = {
      prescribingOrganization: {
        OrganisationName: "Prescriber Unknown",
        ODSCode: "ODSUnknown",
        Address1: "Unknown Rd",
        City: "Unknown City",
        Postcode: "UNK",
        Contacts: [
          {
            ContactMethodType: "Telephone",
            ContactValue: "000-0000",
            ContactAvailabilityType: "9-5",
            ContactType: "office"
          }
        ]
      }
    }

    const resultUnknown = mergePrescriptionDetails(prescriptionDetailsUnknown, doHSDataUnknown)
    expect(resultUnknown.prescriberOrganisation.organisationSummaryObjective.prescribedFrom).toBe("Unknown")
  })

  it("should handle MedicationRequest and MedicationDispense resources with missing fields gracefully", () => {
    const medRequestIncomplete: MedicationRequest = {
      resourceType: "MedicationRequest",
      // missing medicationCodeableConcept, dispenseRequest, dosageInstruction
      status: "on-hold",
      intent: "order",
      subject: {},
      extension: [
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PendingCancellations",
          extension: [
            {url: "lineItemPendingCancellation", valueBoolean: false}
            // missing cancellationReason
          ]
        }
      ]
    }

    const medDispenseIncomplete: MedicationDispense = {
      resourceType: "MedicationDispense",
      // missing medicationCodeableConcept, quantity, dosageInstruction
      status: "entered-in-error"
      // no extension for non-dispensing reason
    }

    const prescriptionDetails: RequestGroup = {
      resourceType: "RequestGroup",
      intent: "order",
      status: "active",
      identifier: [{value: "RXIncomplete"}],
      authoredOn: "2023-07-07T00:00:00Z",
      contained: [medRequestIncomplete, medDispenseIncomplete]
    }

    const result = mergePrescriptionDetails(prescriptionDetails)

    expect(result.prescribedItems).toHaveLength(1)
    expect(result.prescribedItems[0].itemDetails).toEqual({
      medicationName: "Not found",
      quantity: "Not found",
      dosageInstructions: "Not found",
      epsStatusCode: "on-hold",
      nhsAppStatus: "Optional - Not available",
      itemPendingCancellation: false,
      cancellationReason: null
    })

    expect(result.dispensedItems).toHaveLength(1)
    expect(result.dispensedItems[0].itemDetails).toEqual({
      medicationName: "Not found",
      quantity: "Not found",
      dosageInstructions: "Not found",
      epsStatusCode: "entered-in-error",
      nhsAppStatus: "Optional - Not available",
      itemPendingCancellation: false,
      cancellationReason: null,
      notDispensedReason: null,
      initiallyPrescribed: {
        medicationName: "Not found",
        quantity: "Not found",
        dosageInstructions: "Not found"
      }
    })
  })
})
