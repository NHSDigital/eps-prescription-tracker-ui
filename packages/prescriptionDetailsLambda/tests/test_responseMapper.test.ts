import {jest} from "@jest/globals"

import {
  Bundle,
  FhirResource,
  MedicationDispense,
  MedicationRequest,
  Patient,
  RequestGroup,
  RequestGroupAction
} from "fhir/r4"
import {DoHSData} from "../src/utils/types"

import {mergePrescriptionDetails} from "../src/utils/responseMapper"

import {Logger} from "@aws-lambda-powertools/logger"

const logger: Logger = new Logger({serviceName: "responseMapper"})

// Stub out the mapper function so we can verify the mapped value
jest.mock("../src/utils/fhirMappers", () => ({
  mapIntentToPrescriptionTreatmentType: jest.fn((intent: string) => `mapped-${intent}`)
}))

describe("mergePrescriptionDetails", () => {
  let historyAction: RequestGroupAction
  let requestGroup: RequestGroup
  let patient: Patient
  let medicationRequest: MedicationRequest
  let medicationDispense: MedicationDispense
  let prescriptionBundle: Bundle<FhirResource>
  let doHSData: DoHSData
  beforeEach(() => {
    historyAction = {
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
    requestGroup = {
      resourceType: "RequestGroup",
      intent: "order",
      status: "draft",
      identifier: [{value: "RX123"}],
      author: {
        identifier: {
          system: "https://fhir.nhs.uk/Id/ods-organization-code",
          value: "ODS123"
        }
      },
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
        historyAction
      ]
    }
    patient = {
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
    medicationRequest = {
      resourceType: "MedicationRequest",
      id: "med-req-1",
      medicationCodeableConcept: {text: "Drug A"},
      courseOfTherapyType: {coding: [{code: "Acute"}]},
      dispenseRequest: {
        quantity: {value: 20},
        performer: {identifier: {value: "ODS456"}}
      },
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
    medicationDispense = {
      resourceType: "MedicationDispense",
      id: "dispense-1",
      medicationCodeableConcept: {text: "Drug B"},
      quantity: {value: 20},
      dosageInstruction: [{text: "Take two daily"}],
      status: "in-progress",
      authorizingPrescription: [{
        reference: "MedicationRequest/med-req-1"
      }],
      type: {
        coding: [
          {
            system: "https://fhir.nhs.uk/CodeSystem/medicationdispense-type",
            code: "0001",
            display: "Item fully dispensed"
          }
        ]
      },
      extension: [
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionNonDispensingReason",
          valueCoding: {display: "Not available"}
        }
      ]
    }
    prescriptionBundle = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: requestGroup
        },
        {
          resource: patient
        },
        {
          resource: medicationRequest
        },
        {
          resource: medicationDispense
        }
      ]
    }
    doHSData = {
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
  })

  it("should merge full prescription details and DoHS data correctly", () => {
    const result = mergePrescriptionDetails(prescriptionBundle, doHSData, logger)

    // Check patient details
    expect(result).toEqual({
      patientDetails: {
        nhsNumber: "P123",
        prefix: "Mr.",
        given: "John",
        family: "Doe",
        suffix: "Jr.",
        gender: "male",
        dateOfBirth: "1980-01-01",
        address: "123 Main St, Anytown, 12345"
      },
      prescriptionId: "RX123",
      typeCode: "Acute",
      statusCode: "MSG001",
      issueDate: "2020-01-01T00:00:00Z",
      instanceNumber: 2,
      maxRepeats: 5,
      daysSupply: "28",
      prescriptionPendingCancellation: true,
      prescribedItems: [],
      dispensedItems: [{
        medicationName: "Drug B",
        quantity: "20",
        dosageInstructions: "Take two daily",
        epsStatusCode: "0007",
        nhsAppStatus: undefined,
        itemPendingCancellation: false,
        cancellationReason: null,
        notDispensedReason: "Not available",
        initiallyPrescribed: {
          dosageInstructions: "Take two daily",
          medicationName: "Drug A",
          quantity: "20"
        }
      }],
      messageHistory: [{
        messageCode: "prescription-uploaded",
        sentDateTime: "2020-01-02T00:00:00Z",
        organisationName: "Nominated Performer Org",
        organisationODS: "ODS456",
        newStatusCode: "MSG001",
        dispenseNotification: []
      }],
      prescriberOrganisation: {
        name: "Prescriber Org",
        odsCode: "ODS123",
        address: "1 Prescriber Rd, Presc City, PC123",
        telephone: "0123456789",
        prescribedFrom: "England"
      },
      nominatedDispenser: {
        name: "Nominated Performer Org",
        odsCode: "ODS456",
        address: "2 Performer Rd, Perform City, PC456",
        telephone: "0987654321"
      },
      currentDispenser: {
        name: "Dispensing Org One",
        odsCode: "ODS789",
        address: "3 Dispense Rd, Dispense City, PC789",
        telephone: "1112223333"
      }
    })
  })

  it('should default patient details to "Not found" when they are not present', () => {
    delete patient.name
    delete patient.address

    const result = mergePrescriptionDetails(prescriptionBundle, {}, logger)
    expect(result.patientDetails).toEqual({
      nhsNumber: "P123",
      prefix: "",
      given: "Unknown",
      family: "Unknown",
      suffix: "",
      gender: "male",
      dateOfBirth: "1980-01-01",
      address: "Not Found"
    })
  })

  it("should handle missing MedicationDispense resources and history actions gracefully", () => {
    prescriptionBundle.entry = prescriptionBundle.entry!
      .filter(entry => entry.resource!.resourceType !== "MedicationDispense")
    historyAction.action = []

    const result = mergePrescriptionDetails(prescriptionBundle, {}, logger)
    expect(result.dispensedItems).toEqual([])
    expect(result.messageHistory).toEqual([])
  })

  it("should default missing extensions to default values", () => {
    requestGroup.extension = [
      {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType",
        valueCoding: {code: "01"}
      }
    ]

    const result = mergePrescriptionDetails(prescriptionBundle, {}, logger)

    expect(result.instanceNumber).toBe(1) // Default from the implementation
    expect(result.maxRepeats).toBe(0) // Default from the implementation
    expect(result.prescriptionPendingCancellation).toBeFalsy() // Default undefined or false
  })

  it("should use the first patient when multiple patient resources are present", () => {
    prescriptionBundle.entry!.push({
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
    })

    const result = mergePrescriptionDetails(prescriptionBundle, {}, logger)

    // Should use patient1 details
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
  })

  it("should correctly map nested dispense notifications in message history", () => {
    historyAction.action!.push({
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
                  value: "ODS789"
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
    })
    historyAction.action!.push({
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
    })
    prescriptionBundle.entry!.push({
      resource: {
        resourceType: "MedicationDispense",
        id: "123",
        medicationCodeableConcept: {text: "Medication A"},
        quantity: {value: 10, unit: "tablets"},
        dosageInstruction: [{text: "Take one daily"}],
        status: "completed",
        type: {
          coding: [
            {
              system: "https://fhir.nhs.uk/CodeSystem/medicationdispense-type",
              code: "0001",
              display: "Item fully dispensed"
            }
          ]
        }
      }
    })
    prescriptionBundle.entry!.push({
      resource: {
        resourceType: "MedicationDispense",
        id: "789",
        medicationCodeableConcept: {text: "Medication B"},
        quantity: {value: 20, unit: "capsules"},
        dosageInstruction: [{text: "Take two daily"}],
        status: "completed",
        type: {
          coding: [
            {
              system: "https://fhir.nhs.uk/CodeSystem/medicationdispense-type",
              code: "0003",
              display: "Item dispensed - partial"
            }
          ]
        }
      }
    })

    const result = mergePrescriptionDetails(prescriptionBundle, doHSData, logger)

    expect(result.messageHistory).toEqual([
      {
        dispenseNotification: [],
        messageCode: "prescription-uploaded",
        newStatusCode: "MSG001",
        organisationName: "Nominated Performer Org",
        organisationODS: "ODS456",
        sentDateTime: "2020-01-02T00:00:00Z"
      },
      {
        messageCode: "dispense-notified",
        sentDateTime: "2022-02-03T00:00:00Z",
        organisationName: "Dispensing Org One",
        organisationODS: "ODS789",
        newStatusCode: "0003",
        dispenseNotification: [{
          dosageInstruction: "Take one daily",
          id: "notification-id-123",
          medicationName: "Medication A",
          quantity: "10 tablets",
          statusCode: "0001"
        }]
      },
      {
        messageCode: "dispense-notified",
        sentDateTime: "2025-02-21T11:42:06.000Z",
        organisationName: undefined,
        organisationODS: "FA565",
        newStatusCode: "0003",
        dispenseNotification: [{
          dosageInstruction: "Take two daily",
          id: "notification-id-456",
          medicationName: "Medication B",
          quantity: "20 capsules",
          statusCode: "0003"
        }]
      }])
  })

  it("should handle partial doHSData object gracefully", () => {
    delete doHSData.nominatedPerformer
    delete doHSData.dispensingOrganization

    const result = mergePrescriptionDetails(prescriptionBundle, doHSData, logger)

    expect(result.prescriberOrganisation).toEqual({
      name: "Prescriber Org",
      odsCode: "ODS123",
      address: "1 Prescriber Rd, Presc City, PC123",
      telephone: "0123456789",
      prescribedFrom: "England"
    })
    expect(result.nominatedDispenser).toEqual({
      address: "Not found",
      name: "",
      odsCode: "ODS456",
      telephone: "Not found"
    })
    expect(result.currentDispenser).toEqual({
      address: "Not found",
      name: "",
      odsCode: "ODS456",
      telephone: "Not found"
    })
  })

  it("should correctly process multiple MedicationRequest and MedicationDispense resources", () => {
    prescriptionBundle.entry!.push({
      resource: {
        resourceType: "MedicationRequest",
        medicationCodeableConcept: {text: "Drug C"},
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
    })
    const result = mergePrescriptionDetails(prescriptionBundle, {}, logger)

    expect(result.prescribedItems).toEqual([{
      medicationName: "Drug C",
      quantity: "20",
      dosageInstructions: "Twice daily",
      epsStatusCode: "0001",
      nhsAppStatus: undefined,
      itemPendingCancellation: false,
      cancellationReason: null
    }])

    expect(result.dispensedItems).toEqual([{
      medicationName: "Drug B",
      quantity: "20",
      dosageInstructions: "Take two daily",
      epsStatusCode: "0007",
      nhsAppStatus: undefined,
      itemPendingCancellation: false,
      cancellationReason: null,
      notDispensedReason: "Not available",
      initiallyPrescribed: {
        dosageInstructions: "Take two daily",
        medicationName: "Drug A",
        quantity: "20"
      }
    }])
  })

  it("should handle wales typeCode value for prescriber organisation mapping", () => {
    // Test with typeCode "02" for Wales
    requestGroup.extension = [
      {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType",
        valueCoding: {code: "02"}
      }
    ]

    const resultWales = mergePrescriptionDetails(prescriptionBundle, doHSData, logger)
    expect(resultWales.prescriberOrganisation?.prescribedFrom).toBe("Wales")
  })

  it("should handle unknown typeCode value for prescriber organisation mapping", () => {
    // Test with typeCode "03" is unknown
    requestGroup.extension = [
      {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType",
        valueCoding: {code: "03"}
      }
    ]

    const resultWales = mergePrescriptionDetails(prescriptionBundle, doHSData, logger)
    expect(resultWales.prescriberOrganisation?.prescribedFrom).toBe("Unknown")
  })

  it("should handle MedicationRequest and MedicationDispense resources with missing fields gracefully", () => {
    medicationRequest.medicationCodeableConcept!.text = ""
    medicationRequest.dispenseRequest!.quantity!.value = 0
    medicationRequest.dispenseRequest!.quantity!.unit = ""
    delete medicationRequest.dispenseRequest!.performer
    medicationRequest.dosageInstruction![0].text = ""
    medicationDispense.medicationCodeableConcept!.text = ""
    medicationDispense.quantity!.value = 0
    medicationDispense.quantity!.unit = ""
    delete medicationDispense.dosageInstruction

    const result = mergePrescriptionDetails(prescriptionBundle, {}, logger)

    expect(result.dispensedItems).toEqual([{
      medicationName: "",
      quantity: "0",
      dosageInstructions: "Unknown",
      epsStatusCode: "0007",
      nhsAppStatus: undefined,
      itemPendingCancellation: false,
      cancellationReason: null,
      notDispensedReason: "Not available",
      initiallyPrescribed: {
        dosageInstructions: "",
        medicationName: "",
        quantity: "0"
      }
    }])
  })
})
