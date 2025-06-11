import {jest} from "@jest/globals"

import {Bundle, FhirResource} from "fhir/r4"
import {DoHSData} from "../src/utils/types"

import {mergePrescriptionDetails} from "../src/utils/responseMapper"

// Stub out the mapper function so we can verify the mapped value
jest.mock("../src/utils/fhirMappers", () => ({
  mapIntentToPrescriptionTreatmentType: jest.fn((intent: string) => `mapped-${intent}`)
}))

describe("mergePrescriptionDetails", () => {
  it("should throw an error when prescription details are null", () => {
    const mockBundle: Bundle<FhirResource> = {
      resourceType: "Bundle",
      type: "collection",
      entry: []
    }
    expect(() => mergePrescriptionDetails(mockBundle)).toThrow("Prescription details not found")
  })

  it("should merge full prescription details and DoHS data correctly", () => {
    const prescriptionDetails: Bundle<FhirResource> = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
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
                url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
                extension: [
                  {url: "prescriptionPendingCancellation", valueBoolean: true}
                ]
              }
            ],
            action: [
              {
                title: "Prescription Line Items(Medications)",
                timingTiming: {
                  repeat: {
                    period: 28
                  }
                }
              },
              {
                title: "Prescription status transitions",
                action: [
                  {
                    title: "Prescription upload successful",
                    code: [
                      {
                        coding: [
                          {
                            system: "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status",
                            code: "MSG001",
                            display: "Sent"
                          }
                        ]
                      }
                    ],
                    timingDateTime: "2020-01-02T00:00:00Z",
                    participant: [
                      {
                        extension: [
                          {
                            valueReference: {
                              identifier: {
                                value: "ODS456"
                              }
                            },
                            url: ""
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        },
        {
          resource: {
            resourceType: "Patient",
            identifier: [{value: "P123"}],
            name: [{prefix: ["Mr."], given: ["John"], family: "Doe", suffix: ["Jr."]}],
            gender: "male",
            birthDate: "1980-01-01",
            address: [{
              text: "123 Main St, Anytown, 12345",
              line: ["123 Main St"],
              city: "Anytown",
              district: "AnyDistrict",
              postalCode: "12345",
              type: "physical",
              use: "home"
            }]
          }
        },
        {
          resource: {
            resourceType: "MedicationRequest",
            id: "med-req-1",
            medicationCodeableConcept: {text: "Drug A"},
            courseOfTherapyType: {coding: [{code: "Acute"}]},
            dispenseRequest: {quantity: {value: 20}},
            dosageInstruction: [{text: "Take two daily"}],
            status: "active",
            intent: "order",
            subject: {},
            extension: [
              {
                url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-DispensingInformation",
                extension: [
                  {url: "dispenseStatus", valueCoding: {code: "0007", display: "Item to be dispensed"}}
                ]
              },
              {
                url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
                extension: [
                  {url: "lineItemPendingCancellation", valueBoolean: false},
                  {url: "cancellationReason", valueCoding: {display: "None"}}
                ]
              }
            ]
          }
        },
        {
          resource: {
            resourceType: "MedicationDispense",
            id: "dispense-1",
            medicationCodeableConcept: {text: "Drug B"},
            quantity: {value: 20},
            dosageInstruction: [{text: "Take two daily"}],
            status: "completed",
            authorizingPrescription: [{
              reference: "MedicationRequest/med-req-1"
            }],
            extension: [
              {
                url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-TaskBusinessStatus",
                valueCoding: {code: "0001", display: "Item fully dispensed"}
              },
              {
                url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionNonDispensingReason",
                valueCoding: {display: "Not available"}
              }
            ]
          }
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
      dispensingOrganization:
        {
          OrganisationName: "Dispensing Org One",
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
      nhsNumber: "P123",
      prefix: "Mr.",
      given: "John",
      family: "Doe",
      suffix: "Jr.",
      gender: "male",
      dateOfBirth: "1980-01-01",
      address: "123 Main St, Anytown, 12345"
    })

    expect(result.prescriptionId).toBe("RX123")
    expect(result.typeCode).toBe("Acute")
    expect(result.statusCode).toBe("MSG001")
    expect(result.issueDate).toBe("2020-01-01T00:00:00Z")
    expect(result.instanceNumber).toBe(2)
    expect(result.maxRepeats).toBe(5)
    expect(result.daysSupply).toBe("28")
    expect(result.prescriptionPendingCancellation).toBe(true)

    // Check prescribed items
    expect(result.prescribedItems).toHaveLength(1)
    expect(result.prescribedItems[0]).toEqual({
      medicationName: "Drug A",
      quantity: "20",
      dosageInstructions: "Take two daily",
      epsStatusCode: "0007",
      nhsAppStatus: undefined,
      itemPendingCancellation: false,
      cancellationReason: null
    })

    // Check dispensed items
    expect(result.dispensedItems).toHaveLength(1)
    expect(result.dispensedItems[0]).toEqual({
      medicationName: "Drug B",
      quantity: "20",
      dosageInstructions: "Take two daily",
      epsStatusCode: "0001",
      nhsAppStatus: undefined,
      itemPendingCancellation: false,
      cancellationReason: null,
      notDispensedReason: "Not available",
      initiallyPrescribed: {
        dosageInstructions: "Take two daily",
        medicationName: "Drug A",
        quantity: "20"
      }
    })

    // Check message history
    expect(result.messageHistory).toHaveLength(1)
    expect(result.messageHistory[0]).toEqual({
      messageCode: "prescription-uploaded",
      sentDateTime: "2020-01-02T00:00:00Z",
      organisationName: "Nominated Performer Org",
      organisationODS: "ODS456",
      newStatusCode: "MSG001",
      dispenseNotification: []
    })

    // Check prescriber organisation
    expect(result.prescriberOrganisation).toEqual({
      name: "Prescriber Org",
      odsCode: "ODS123",
      address: "1 Prescriber Rd, Presc City, PC123",
      telephone: "0123456789",
      prescribedFrom: "England"
    })

    // Check nominated dispenser
    expect(result.nominatedDispenser).toEqual({
      name: "Nominated Performer Org",
      odsCode: "ODS456",
      address: "2 Performer Rd, Perform City, PC456",
      telephone: "0987654321"
    })

    // Check current dispenser
    expect(result.currentDispenser).toEqual({
      name: "Dispensing Org One",
      odsCode: "ODS789",
      address: "3 Dispense Rd, Dispense City, PC789",
      telephone: "1112223333"
    })
  })

  it('should default patient details to "Not found" when no patient is contained', () => {
    const mockBundle: Bundle<FhirResource> = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
            resourceType: "RequestGroup",
            intent: "order",
            status: "active",
            contained: [] // No contained patient resource
          }
        }
      ]
    }

    const result = mergePrescriptionDetails(mockBundle)
    expect(result.patientDetails).toEqual({
      nhsNumber: "Unknown",
      prefix: "",
      suffix: "",
      given: "Unknown",
      family: "Unknown",
      gender: null,
      dateOfBirth: null,
      address: null
    })
  })

  it("should handle missing MedicationRequest and MedicationDispense resources gracefully", () => {
    const mockBundle: Bundle<FhirResource> = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
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
        }
      ]
    }

    const result = mergePrescriptionDetails(mockBundle)
    expect(result.prescribedItems).toEqual([])
    expect(result.dispensedItems).toEqual([])
    expect(result.messageHistory).toEqual([])
  })

  it("should default missing extensions to default values", () => {
    const mockBundle: Bundle<FhirResource> = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
            resourceType: "RequestGroup",
            intent: "order",
            status: "active",
            identifier: [{value: "RX999"}],
            authoredOn: "2021-01-01T00:00:00Z",
            contained: []
          }
        }
      ]
    }

    const result = mergePrescriptionDetails(mockBundle)

    expect(result.typeCode).toBe("Unknown")
    expect(result.instanceNumber).toBe(1) // Default from the implementation
    expect(result.maxRepeats).toBe(0) // Default from the implementation
    expect(result.prescriptionPendingCancellation).toBeFalsy() // Default undefined or false
  })

  it("should use the first patient when multiple patient resources are contained", () => {
    const mockBundle: Bundle<FhirResource> = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
            resourceType: "RequestGroup",
            intent: "order",
            status: "active"
          }
        },
        {
          resource: {
            resourceType: "Patient",
            identifier: [{value: "P111"}],
            name: [{prefix: ["Dr."], given: ["Alice"], family: "Smith", suffix: ["PhD"]}],
            gender: "female",
            birthDate: "1975-07-07",
            address: [{
              text: "789 First St, CityOne, 11111",
              line: ["789 First St"],
              city: "CityOne",
              district: "DistrictOne",
              postalCode: "11111",
              type: "physical",
              use: "home"
            }]
          }
        },
        {
          resource: {
            resourceType: "Patient",
            identifier: [{value: "P222"}],
            name: [{prefix: ["Mr."], given: ["Bob"], family: "Jones", suffix: []}],
            gender: "male",
            birthDate: "1985-08-08",
            address: [{
              text: "101 Second St, CityTwo, 22222",
              line: ["101 Second St"],
              city: "CityTwo",
              district: "DistrictTwo",
              postalCode: "22222",
              type: "physical",
              use: "home"
            }]
          }
        }
      ]
    }

    const result = mergePrescriptionDetails(mockBundle)

    // Should use patient1 details
    expect(result.patientDetails).toEqual({
      nhsNumber: "P111",
      prefix: "Dr.",
      suffix: "PhD",
      given: "Alice",
      family: "Smith",
      gender: "female",
      dateOfBirth: "1975-07-07",
      address: "789 First St, CityOne, 11111"
    })
  })

  it("should correctly map nested dispense notifications in message history", () => {
    const mockBundle: Bundle<FhirResource> = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
            resourceType: "RequestGroup",
            intent: "order",
            status: "active",
            identifier: [{value: "RX555"}],
            authoredOn: "2022-02-02T00:00:00Z",
            action: [
              {
                title: "Prescription status transitions",
                action: [
                  {
                    title: "Dispense notification successful",
                    timingDateTime: "2022-02-03T00:00:00Z",
                    code: [
                      {
                        coding: [
                          {
                            system: "https://tools.ietf.org/html/rfc4122",
                            code: "notification-id-123"
                          }
                        ]
                      },
                      {
                        coding: [
                          {
                            system: "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status",
                            code: "0003"
                          }
                        ]
                      }
                    ],
                    participant: [
                      {
                        extension: [
                          {
                            valueReference: {
                              identifier: {
                                value: "ODS000"
                              }
                            },
                            url: ""
                          }
                        ]
                      }
                    ],
                    action: [
                      {
                        resource: {reference: "MedicationDispense/123"}
                      }
                    ]
                  },
                  {
                    title: "Dispense notification successful",
                    timingDateTime: "2025-02-21T11:42:06.000Z",
                    code: [
                      {
                        coding: [
                          {
                            system: "https://tools.ietf.org/html/rfc4122",
                            code: "notification-id-456"
                          }
                        ]
                      },
                      {
                        coding: [
                          {
                            system: "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status",
                            code: "0003"
                          }
                        ]
                      }
                    ],
                    participant: [
                      {
                        extension: [
                          {
                            valueReference: {
                              identifier: {
                                value: "FA565"
                              }
                            },
                            url: ""
                          }
                        ]
                      }
                    ],
                    action: [
                      {
                        resource: {reference: "MedicationDispense/789"}
                      }
                    ]
                  }
                ]
              }
            ]
          }
        },
        {
          resource: {
            resourceType: "MedicationDispense",
            id: "123",
            medicationCodeableConcept: {text: "Medication A"},
            quantity: {value: 10, unit: "tablets"},
            dosageInstruction: [{text: "Take one daily"}],
            status: "completed"
          }
        },
        {
          resource: {
            resourceType: "MedicationDispense",
            id: "789",
            medicationCodeableConcept: {text: "Medication B"},
            quantity: {value: 20, unit: "capsules"},
            dosageInstruction: [{text: "Take two daily"}],
            status: "completed"
          }
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

    const result = mergePrescriptionDetails(mockBundle, doHSData)

    expect(result.messageHistory).toHaveLength(2)
    expect(result.messageHistory[0]).toEqual({
      messageCode: "dispense-notified",
      sentDateTime: "2022-02-03T00:00:00Z",
      organisationName: "Nominated Org",
      organisationODS: "ODS000",
      newStatusCode: "0003",
      dispenseNotification: [{
        dosageInstruction: "Take one daily",
        id: "notification-id-123",
        medicationName: "Medication A",
        quantity: "10 tablets"
      }]
    })
  })

  it("should handle partial doHSData object gracefully", () => {
    const mockBundle: Bundle<FhirResource> = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
            resourceType: "RequestGroup",
            intent: "order",
            status: "active",
            identifier: [{value: "RX777"}],
            authoredOn: "2023-03-03T00:00:00Z",
            contained: []
          }
        }
      ]
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

    const result = mergePrescriptionDetails(mockBundle, partialDoHSData)

    expect(result.prescriberOrganisation).toEqual({
      name: "Only Prescriber Org",
      odsCode: "ODS111",
      address: "1 Only Rd, Solo City, SC111",
      telephone: "111-222-3333",
      prescribedFrom: "Unknown"
    })
    expect(result.nominatedDispenser).toBeUndefined()
    expect(result.currentDispenser).toBeUndefined() // Implementation returns undefined, not []
  })

  it("should correctly process multiple MedicationRequest and MedicationDispense resources", () => {
    const mockBundle: Bundle<FhirResource> = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
            resourceType: "RequestGroup",
            intent: "order",
            status: "active",
            identifier: [{value: "RX888"}],
            authoredOn: "2023-04-04T00:00:00Z"
          }
        },
        {
          resource: {
            resourceType: "MedicationRequest",
            medicationCodeableConcept: {text: "Drug X"},
            dispenseRequest: {quantity: {value: 10}},
            dosageInstruction: [{text: "Once daily"}],
            status: "active",
            intent: "order",
            subject: {},
            statusReason: {
              text: "Reason X"
            },
            extension: [
              {
                url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-DispensingInformation",
                extension: [
                  {url: "dispenseStatus", valueCoding: {code: "0007", display: "Item to be dispensed"}}
                ]
              },
              {
                url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
                extension: [
                  {url: "lineItemPendingCancellation", valueBoolean: true},
                  {url: "cancellationReason", valueCoding: {display: "Reason X"}}
                ]
              }
            ]
          }
        },
        {
          resource: {
            resourceType: "MedicationRequest",
            medicationCodeableConcept: {text: "Drug Y"},
            dispenseRequest: {quantity: {value: 20}},
            dosageInstruction: [{text: "Twice daily"}],
            status: "completed",
            intent: "order",
            subject: {},
            extension: [
              {
                url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-DispensingInformation",
                extension: [
                  {url: "dispenseStatus", valueCoding: {code: "0001", display: "Item fully dispensed"}}
                ]
              },
              {
                url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
                extension: [
                  {url: "lineItemPendingCancellation", valueBoolean: false},
                  {url: "cancellationReason", valueCoding: {display: "None"}}
                ]
              }
            ]
          }
        },
        {
          resource: {
            resourceType: "MedicationDispense",
            id: "dispense-x",
            medicationCodeableConcept: {text: "Drug Z"},
            quantity: {value: 15},
            status: "completed",
            authorizingPrescription: [{
              reference: "MedicationRequest/med-req-x"
            }],
            statusReasonCodeableConcept: {
              text: "Not available"
            },
            extension: [
              {
                url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-TaskBusinessStatus",
                valueCoding: {code: "0001", display: "Item fully dispensed"}
              }
            ]
          }
        }
      ]
    }

    const result = mergePrescriptionDetails(mockBundle)

    expect(result.prescribedItems).toHaveLength(2)
    expect(result.prescribedItems[0]).toEqual({
      medicationName: "Drug X",
      quantity: "10",
      dosageInstructions: "Once daily",
      epsStatusCode: "0007",
      nhsAppStatus: undefined,
      itemPendingCancellation: true,
      cancellationReason: "Reason X"
    })
    expect(result.prescribedItems[1]).toEqual({
      medicationName: "Drug Y",
      quantity: "20",
      dosageInstructions: "Twice daily",
      epsStatusCode: "0001",
      nhsAppStatus: undefined,
      itemPendingCancellation: false,
      cancellationReason: null
    })

    expect(result.dispensedItems).toHaveLength(1)
    expect(result.dispensedItems[0]).toEqual({
      medicationName: "Drug Z",
      quantity: "15",
      dosageInstructions: "Once daily",
      epsStatusCode: "0001",
      nhsAppStatus: undefined,
      itemPendingCancellation: true,
      cancellationReason: "Reason X",
      notDispensedReason: "Not available",
      initiallyPrescribed: {
        medicationName: "Drug X",
        quantity: "10",
        dosageInstructions: "Once daily"

      }
    })
  })

  it("should handle different typeCode values for prescriber organisation mapping", () => {
    // Test with typeCode "02" for Wales
    const mockBundleWales: Bundle<FhirResource> = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
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
        }
      ]
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

    const resultWales = mergePrescriptionDetails(mockBundleWales, doHSDataWales)
    expect(resultWales.prescriberOrganisation?.prescribedFrom).toBe("Wales")

    // Test with typeCode "03" should yield "Unknown"
    const mockBundleUnknown: Bundle<FhirResource> = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
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
        }
      ]
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

    const resultUnknown = mergePrescriptionDetails(mockBundleUnknown, doHSDataUnknown)
    expect(resultUnknown.prescriberOrganisation?.prescribedFrom).toBe("Unknown")
  })

  it("should handle MedicationRequest and MedicationDispense resources with missing fields gracefully", () => {
    const mockBundle: Bundle<FhirResource> = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
            resourceType: "RequestGroup",
            intent: "order",
            status: "active",
            identifier: [{value: "RXIncomplete"}],
            authoredOn: "2023-07-07T00:00:00Z"
          }
        },
        {
          resource: {
            resourceType: "MedicationRequest",
            // missing medicationCodeableConcept, dispenseRequest, dosageInstruction
            status: "on-hold",
            intent: "order",
            subject: {},
            extension: [
              {
                url: "https://fhir.nhs.uk/StructureDefinition/Extension-PendingCancellation",
                extension: [
                  {url: "lineItemPendingCancellation", valueBoolean: false}
                  // missing cancellationReason
                ]
              }
            ]
          }
        },
        {
          resource: {
            resourceType: "MedicationDispense",
            // missing medicationCodeableConcept, quantity, dosageInstruction
            status: "entered-in-error"
            // no extension for non-dispensing reason
          }
        }
      ]
    }

    const result = mergePrescriptionDetails(mockBundle)

    expect(result.prescribedItems).toHaveLength(1)
    expect(result.prescribedItems[0]).toEqual({
      medicationName: "Unknown",
      quantity: "Unknown",
      dosageInstructions: "Unknown",
      epsStatusCode: "unknown",
      nhsAppStatus: undefined,
      itemPendingCancellation: false,
      cancellationReason: null
    })

    expect(result.dispensedItems).toHaveLength(1)
    expect(result.dispensedItems[0]).toEqual({
      medicationName: "Unknown",
      quantity: "Unknown",
      dosageInstructions: "Unknown",
      epsStatusCode: "unknown",
      nhsAppStatus: undefined,
      itemPendingCancellation: false,
      cancellationReason: null,
      notDispensedReason: undefined,
      initiallyPrescribed: undefined
    })
  })
})
