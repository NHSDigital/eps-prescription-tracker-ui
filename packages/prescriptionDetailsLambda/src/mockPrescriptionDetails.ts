export const mockPrescriptionDetails = {
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [
    {
      "resource": {
        "resourceType": "RequestGroup",
        "intent": "proposal",
        "status": "active",
        "groupIdentifier": {
          "system": "https://fhir.nhs.uk/Id/prescription-group",
          "value": "C0C757-A83008-C2D93O"
        },
        "identifier": [
          {
            "system": "https://fhir.nhs.uk/Id/prescription-order-number",
            "value": "1"
          }
        ],
        "code": {
          "coding": [
            {
              "system": "https://fhir.nhs.uk/CodeSystem/prescription-type",
              "code": "0101",
              "display": "Prescription Type"
            }
          ]
        }
      }
    },
    {
      "resource": {
        "resourceType": "MedicationRequest",
        "id": "C0C757-A83008-C2D93O",
        "intent": "order",
        "subject": {
          "reference": "Patient12345"
        },
        "status": "active",
        "medicationCodeableConcept": {
          "coding": [
            {
              "system": "https://fhir.nhs.uk/CodeSystem/medication",
              "code": "Amoxicillin 250mg capsules",
              "display": "Amoxicillin 250mg capsules"
            }
          ]
        },
        "dispenseRequest": {
          "quantity": {
            "value": 20
          }
        },
        "dosageInstruction": [
          {
            "text": "2 times a day for 10 days"
          }
        ]
      }
    },
    {
      "resource": {
        "resourceType": "MedicationRequest",
        "id": "C0C757-A83008-C2D93O",
        "intent": "order",
        "subject": {
          "reference": "Patient12345"
        },
        "status": "active",
        "medicationCodeableConcept": {
          "coding": [
            {
              "system": "https://fhir.nhs.uk/CodeSystem/medication",
              "code": "Co-codamol 30mg/500mg tablets",
              "display": "Co-codamol 30mg/500mg tablets"
            }
          ]
        },
        "dispenseRequest": {
          "quantity": {
            "value": 20
          }
        },
        "dosageInstruction": [
          {
            "text": "2 times a day for 10 days"
          }
        ]
      }
    },
    {
      "resource": {
        "resourceType": "MedicationRequest",
        "id": "C0C757-A83008-C2D93O",
        "intent": "order",
        "subject": {
          "reference": "Patient12345"
        },
        "status": "active",
        "medicationCodeableConcept": {
          "coding": [
            {
              "system": "https://fhir.nhs.uk/CodeSystem/medication",
              "code": "Pseudoephedrine hydrochloride 60mg tablets",
              "display": "Pseudoephedrine hydrochloride 60mg tablets"
            }
          ]
        },
        "dispenseRequest": {
          "quantity": {
            "value": 30
          }
        },
        "dosageInstruction": [
          {
            "text": "3 times a day for 10 days"
          }
        ]
      }
    },
    {
      "resource": {
        "resourceType": "MedicationRequest",
        "id": "C0C757-A83008-C2D93O",
        "intent": "order",
        "subject": {
          "reference": "Patient12345"
        },
        "status": "active",
        "medicationCodeableConcept": {
          "coding": [
            {
              "system": "https://fhir.nhs.uk/CodeSystem/medication",
              "code": "Azithromycin 250mg capsules",
              "display": "Azithromycin 250mg capsules"
            }
          ]
        },
        "dispenseRequest": {
          "quantity": {
            "value": 30
          }
        },
        "dosageInstruction": [
          {
            "text": "3 times a day for 10 days"
          }
        ]
      }
    },
    {
      "resource": {
        "resourceType": "Task",
        "id": "C0C757-A83008-C2D93O",
        "status": "completed",
        "intent": "order",
        "groupIdentifier": {
          "system": "https://fhir.nhs.uk/Id/task-group",
          "value": "Release Request successful"
        },
        "authoredOn": "20250203141019",
        "owner": {
          "identifier": {
            "system": "https://fhir.nhs.uk/Id/pharmacy",
            "value": "VNFKT"
          }
        },
        "businessStatus": {
          "coding": [
            {
              "system": "https://fhir.nhs.uk/CodeSystem/task-status",
              "code": "0002",
              "display": "Task Status"
            }
          ]
        },
        "output": [
          {
            "type": {
              "coding": [
                {
                  "system": "https://fhir.nhs.uk/CodeSystem/task-output",
                  "code": "medication-dispense",
                  "display": "Medication Dispense Reference"
                }
              ]
            },
            "valueReference": {
              "reference": "MedicationDispense/C0C757-A83008-C2D93O"
            }
          }
        ]
      }
    }
  ]
}
