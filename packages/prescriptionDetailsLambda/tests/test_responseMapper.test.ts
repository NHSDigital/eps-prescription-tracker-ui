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
import {PrescriptionOdsCodes} from "src/utils/extensionUtils"

describe("mergePrescriptionDetails", () => {
  const participantExtensionUrl =
    "http://hl7.org/fhir/5.0/StructureDefinition/extension-RequestOrchestration.action.participant.typeReference"
  let historyAction: RequestGroupAction
  let requestGroup: RequestGroup
  let patient: Patient
  let medicationRequest: MedicationRequest
  let medicationDispense: MedicationDispense
  let prescriptionBundle: Bundle<FhirResource>
  let doHSData: DoHSData
  let odsCodes: PrescriptionOdsCodes
  beforeEach(() => {
    historyAction = {
      title: "Prescription status transitions",
      action: [
        {
          title: "Prescription upload successful",
          code: [{
            coding: [{
              system: "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status",
              code: "0001"
            }]
          }],
          timingDateTime: "2020-01-02T00:00:00Z",
          participant: [{
            extension: [{
              valueReference: {
                identifier: {
                  system: "https://fhir.nhs.uk/Id/ods-organization-code",
                  value: "ODS123"
                }
              },
              url: participantExtensionUrl
            }]
          }]
        },
        {
          title: "Dispense notification successful",
          code: [{
            coding: [{
              system: "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status",
              code: "0006"
            }]
          }],
          timingDateTime: "2020-01-03T00:00:00Z",
          participant: [{
            extension: [{
              valueReference: {
                identifier: {
                  system: "https://fhir.nhs.uk/Id/ods-organization-code",
                  value: "ODS789"
                }
              },
              url: participantExtensionUrl
            }]
          }],
          action: [{
            resource: {reference: "urn:uuid:00000000-0000-0000-000000000001"}
          }]
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
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PrescriptionStatusHistory",
          extension: [
            {url: "status", valueCoding: {
              system: "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status",
              code: "0006"
            }}
          ]
        },
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
        },
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-PrescriptionStatusHistory",
          extension: [
            {url: "cancellationReason", valueCoding: {
              system: "https://fhir.nhs.uk/CodeSystem/medicationrequest-status-reason",
              code: "0001",
              display: "Prescribing Error"
            }}
          ]
        },
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionNonDispensingReason",
          valueCoding: {
            system: "https://fhir.nhs.uk/CodeSystem/medicationdispense-status-reason",
            code: "0002",
            display: "Clinically unsuitable"
          }
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
        line: ["123 Main St", "Anytown", "AnyDistrict"],
        postalCode: "12345",
        type: "both",
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
      id: "00000000-0000-0000-000000000001",
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
      }
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
    odsCodes = {
      prescribingOrganization: "ODS123",
      nominatedPerformer: "ODS456",
      dispensingOrganization: "ODS789"
    }
  })

  it("should merge full prescription details and DoHS data correctly", () => {
    const result = mergePrescriptionDetails(prescriptionBundle, doHSData, odsCodes)

    // Check patient details
    expect(result).toEqual({
      patientDetails: {
        nhsNumber: "P123",
        givenName: ["John"],
        familyName: "Doe",
        gender: "male",
        dateOfBirth: "1980-01-01",
        address: ["123 Main St", "Anytown", "AnyDistrict"],
        postcode: "12345"
      },
      patientFallback: true,
      prescriptionId: "RX123",
      typeCode: "Acute",
      statusCode: "0006",
      issueDate: "2020-01-01T00:00:00Z",
      instanceNumber: 2,
      maxRepeats: 5,
      daysSupply: "28",
      prescriptionPendingCancellation: true,
      cancellationReason: "0001",
      nonDispensingReason: "0002",
      items: [{
        medicationName: "Drug A",
        quantity: "20",
        dosageInstructions: "Take two daily",
        epsStatusCode: "0007",
        pharmacyStatus: undefined,
        itemPendingCancellation: false,
        cancellationReason: undefined,
        notDispensedReason: undefined
      }],
      messageHistory: [{
        messageCode: "prescription-uploaded",
        sentDateTime: "2020-01-02T00:00:00Z",
        orgName: "Prescriber Org",
        orgODS: "ODS123",
        newStatusCode: "0001",
        dispenseNotificationItems: undefined
      }, {
        messageCode: "dispense-notified",
        sentDateTime: "2020-01-03T00:00:00Z",
        orgName: "Dispensing Org One",
        orgODS: "ODS789",
        newStatusCode: "0006",
        dispenseNotificationItems: [{
          statusCode: "0001",
          components: [{
            medicationName: "Drug B",
            quantity: "20",
            dosageInstruction: "Take two daily"
          }]
        }]
      }],
      prescriberOrg: {
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

  it("should only include the patient details included on the prescription", () => {
    delete patient.name
    delete patient.address

    const result = mergePrescriptionDetails(prescriptionBundle, {}, odsCodes)
    expect(result.patientDetails).toEqual({
      nhsNumber: "P123",
      gender: "male",
      dateOfBirth: "1980-01-01"
    })
  })

  it("should handle missing MedicationDispense resources and history actions gracefully", () => {
    prescriptionBundle.entry = prescriptionBundle.entry!
      .filter(entry => entry.resource!.resourceType !== "MedicationDispense")
    historyAction.action = []

    const result = mergePrescriptionDetails(prescriptionBundle, {}, odsCodes)
    expect(result.messageHistory).toEqual([])
  })

  it("should default missing extensions to default values", () => {
    requestGroup.extension = [
      {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType",
        valueCoding: {code: "01"}
      }
    ]

    const result = mergePrescriptionDetails(prescriptionBundle, {}, odsCodes)

    expect(result.instanceNumber).toBe(1)
    expect(result.maxRepeats).toBeUndefined()
    expect(result.prescriptionPendingCancellation).toBe(false)
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

    const result = mergePrescriptionDetails(prescriptionBundle, {}, odsCodes)

    // Should use patient1 details
    expect(result.patientDetails).toEqual({
      nhsNumber: "P123",
      givenName: ["John"],
      familyName: "Doe",
      gender: "male",
      dateOfBirth: "1980-01-01",
      address: ["123 Main St", "Anytown", "AnyDistrict"],
      postcode: "12345"
    })
  })

  it("should handle partial doHSData object gracefully", () => {
    delete doHSData.nominatedPerformer
    delete doHSData.dispensingOrganization

    const result = mergePrescriptionDetails(prescriptionBundle, doHSData, odsCodes)

    expect(result.prescriberOrg).toEqual({
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
      odsCode: "ODS789",
      telephone: "Not found"
    })
  })

  it("should correctly process multiple MedicationRequest resources", () => {
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
    const result = mergePrescriptionDetails(prescriptionBundle, {}, odsCodes)

    expect(result.items).toEqual([{
      medicationName: "Drug A",
      quantity: "20",
      dosageInstructions: "Take two daily",
      epsStatusCode: "0007",
      pharmacyStatus: undefined,
      itemPendingCancellation: false,
      cancellationReason: undefined,
      notDispensedReason: undefined
    },
    {
      medicationName: "Drug C",
      quantity: "20",
      dosageInstructions: "Twice daily",
      epsStatusCode: "0001",
      pharmacyStatus: undefined,
      itemPendingCancellation: false,
      cancellationReason: undefined,
      notDispensedReason: undefined
    }])
  })

  it("should correctly process multiple MedicationDispenses on the same DN", () => {
    prescriptionBundle.entry!.push({
      resource: {
        resourceType: "MedicationDispense",
        id: "00000000-0000-0000-000000000002",
        medicationCodeableConcept: {text: "Drug C"},
        quantity: {value: 20},
        dosageInstruction: [{text: "Take four daily"}],
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
        }
      }
    })
    historyAction.action![1].action!.push({
      resource: {reference: "urn:uuid:00000000-0000-0000-000000000002"}
    })
    const result = mergePrescriptionDetails(prescriptionBundle, doHSData, odsCodes)

    expect(result.messageHistory[1]).toEqual({
      messageCode: "dispense-notified",
      sentDateTime: "2020-01-03T00:00:00Z",
      orgName: "Dispensing Org One",
      orgODS: "ODS789",
      newStatusCode: "0006",
      dispenseNotificationItems: [{
        statusCode: "0001",
        components: [{
          medicationName: "Drug B",
          quantity: "20",
          dosageInstruction: "Take two daily"
        }, {
          medicationName: "Drug C",
          quantity: "20",
          dosageInstruction: "Take four daily"
        }]
      }]
    })
  })

  it("should correctly process multiple MedicationDispenses on different DNs", () => {
    prescriptionBundle.entry!.push({
      resource: {
        resourceType: "MedicationDispense",
        id: "00000000-0000-0000-000000000002",
        medicationCodeableConcept: {text: "Drug B"},
        quantity: {value: 10},
        dosageInstruction: [{text: "Take two daily"}],
        status: "in-progress",
        authorizingPrescription: [{
          reference: "MedicationRequest/med-req-1"
        }],
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
    historyAction.action!.push({
      title: "Dispense notification successful",
      code: [{
        coding: [{
          system: "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status",
          code: "0002"
        }]
      }],
      timingDateTime: "2020-01-02T16:00:00Z",
      participant: [{
        extension: [{
          valueReference: {
            identifier: {
              system: "https://fhir.nhs.uk/Id/ods-organization-code",
              value: "ODS789"
            }
          },
          url: participantExtensionUrl
        }]
      }],
      action: [{
        resource: {reference: "urn:uuid:00000000-0000-0000-000000000002"}
      }]
    })
    const result = mergePrescriptionDetails(prescriptionBundle, doHSData, odsCodes)

    expect(result.messageHistory).toEqual([
      expect.anything(), // Don't care about prescription upload message here
      {
        messageCode: "dispense-notified",
        sentDateTime: "2020-01-03T00:00:00Z",
        orgName: "Dispensing Org One",
        orgODS: "ODS789",
        newStatusCode: "0006",
        dispenseNotificationItems: [{
          statusCode: "0001",
          components: [{
            medicationName: "Drug B",
            quantity: "20",
            dosageInstruction: "Take two daily"
          }]
        }]
      },
      {
        messageCode: "dispense-notified",
        sentDateTime: "2020-01-02T16:00:00Z",
        orgName: "Dispensing Org One",
        orgODS: "ODS789",
        newStatusCode: "0002",
        dispenseNotificationItems: [{
          statusCode: "0003",
          components: [{
            medicationName: "Drug B",
            quantity: "10",
            dosageInstruction: "Take two daily"
          }]
        }]
      }
    ])
  })

  it("should handle wales typeCode value for prescriber organisation mapping", () => {
    // Test with typeCode "02" for Wales
    requestGroup.extension = [
      {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType",
        valueCoding: {code: "02"}
      }
    ]

    const resultWales = mergePrescriptionDetails(prescriptionBundle, doHSData, odsCodes)
    expect(resultWales.prescriberOrg?.prescribedFrom).toBe("Wales")
  })

  it("should handle unknown typeCode value for prescriber organisation mapping", () => {
    // Test with typeCode "03" is unknown
    requestGroup.extension = [
      {
        url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType",
        valueCoding: {code: "03"}
      }
    ]

    const resultWales = mergePrescriptionDetails(prescriptionBundle, doHSData, odsCodes)
    expect(resultWales.prescriberOrg?.prescribedFrom).toBe("Unknown")
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

    const result = mergePrescriptionDetails(prescriptionBundle, {}, odsCodes)

    expect(result.items).toEqual([{
      medicationName: "",
      quantity: "0",
      dosageInstructions: "",
      epsStatusCode: "0007",
      pharmacyStatus: undefined,
      itemPendingCancellation: false,
      cancellationReason: undefined,
      notDispensedReason: undefined
    }])
  })
})
