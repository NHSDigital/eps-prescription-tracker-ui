import {
  jest,
  describe,
  it,
  expect,
  beforeEach
} from "@jest/globals"
import {getPdsPatientDetails} from "../src/services/patientDetailsLookupService"
import {Logger} from "@aws-lambda-powertools/logger"
import {AxiosInstance, AxiosResponse} from "axios"
import {PDSError} from "../src/utils/errors"

// Create mock axios instance with get method
const mockGet = jest.fn(() => Promise.resolve({} as unknown as AxiosResponse))
const mockAxiosInstance = {
  get: mockGet
}

// Mock the axios module
jest.mock("axios", () => ({
  create: () => mockAxiosInstance
}))

describe("Patient Details Lookup Service Tests", () => {
  const mockLogger = new Logger({serviceName: "test"})
  const mockEndpoint = "http://test-endpoint/personal-demographics/FHIR/R4"
  const mockAccessToken = "test-token"
  const mockRoleId = "test-role"
  const mockNhsNumber = "9000000009"

  const mockPdsBundle = {
    "resourceType": "Patient",
    "id": "9000000009",
    "identifier": [
      {
        "system": "https://fhir.nhs.uk/Id/nhs-number",
        "value": "9000000009",
        "extension": [
          {
            "url": "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-NHSNumberVerificationStatus",
            "valueCodeableConcept": {
              "coding": [
                {
                  "system": "https://fhir.hl7.org.uk/CodeSystem/UKCore-NHSNumberVerificationStatus",
                  "version": "1.0.0",
                  "code": "01",
                  "display": "Number present and verified"
                }
              ]
            }
          }
        ]
      }
    ],
    "meta": {
      "versionId": "2",
      "security": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
          "code": "U",
          "display": "unrestricted"
        }
      ]
    },
    "name": [
      {
        "id": "123",
        "use": "usual",
        "period": {
          "start": "2020-01-01",
          "end": "2021-12-31"
        },
        "given": [
          "Jane"
        ],
        "family": "Smith",
        "prefix": [
          "Mrs"
        ]
      }
    ],
    "gender": "female",
    "birthDate": "2010-10-22",
    "multipleBirthInteger": 1,
    "deceasedDateTime": "2010-10-22T00:00:00+00:00",
    "generalPractitioner": [
      {
        "id": "254406A3",
        "type": "Organization",
        "identifier": {
          "system": "https://fhir.nhs.uk/Id/ods-organization-code",
          "value": "Y12345",
          "period": {
            "start": "2020-01-01",
            "end": "2021-12-31"
          }
        }
      }
    ],
    "managingOrganization": {
      "type": "Organization",
      "identifier": {
        "system": "https://fhir.nhs.uk/Id/ods-organization-code",
        "value": "Y12345",
        "period": {
          "start": "2020-01-01",
          "end": "2021-12-31"
        }
      }
    },
    "extension": [
      {
        "url": "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-NominatedPharmacy",
        "valueReference": {
          "identifier": {
            "system": "https://fhir.nhs.uk/Id/ods-organization-code",
            "value": "Y12345"
          }
        }
      },
      {
        "url": "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-PreferredDispenserOrganization",
        "valueReference": {
          "identifier": {
            "system": "https://fhir.nhs.uk/Id/ods-organization-code",
            "value": "Y23456"
          }
        }
      },
      {
        "url": "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-MedicalApplianceSupplier",
        "valueReference": {
          "identifier": {
            "system": "https://fhir.nhs.uk/Id/ods-organization-code",
            "value": "Y34567"
          }
        }
      },
      {
        "url": "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-DeathNotificationStatus",
        "extension": [
          {
            "url": "deathNotificationStatus",
            "valueCodeableConcept": {
              "coding": [
                {
                  "system": "https://fhir.hl7.org.uk/CodeSystem/UKCore-DeathNotificationStatus",
                  "version": "1.0.0",
                  "code": "2",
                  "display": "Formal - death notice received from Registrar of Deaths"
                }
              ]
            }
          },
          {
            "url": "systemEffectiveDate",
            "valueDateTime": "2010-10-22T00:00:00+00:00"
          }
        ]
      },
      {
        "url": "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-NHSCommunication",
        "extension": [
          {
            "url": "language",
            "valueCodeableConcept": {
              "coding": [
                {
                  "system": "https://fhir.hl7.org.uk/CodeSystem/UKCore-HumanLanguage",
                  "version": "1.0.0",
                  "code": "fr",
                  "display": "French"
                }
              ]
            }
          },
          {
            "url": "interpreterRequired",
            "valueBoolean": true
          }
        ]
      },
      {
        "url": "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-ContactPreference",
        "extension": [
          {
            "url": "PreferredWrittenCommunicationFormat",
            "valueCodeableConcept": {
              "coding": [
                {
                  "system": "https://fhir.hl7.org.uk/CodeSystem/UKCore-PreferredWrittenCommunicationFormat",
                  "code": "12",
                  "display": "Braille"
                }
              ]
            }
          },
          {
            "url": "PreferredContactMethod",
            "valueCodeableConcept": {
              "coding": [
                {
                  "system": "https://fhir.hl7.org.uk/CodeSystem/UKCore-PreferredContactMethod",
                  "code": "1",
                  "display": "Letter"
                }
              ]
            }
          },
          {
            "url": "PreferredContactTimes",
            "valueString": "Not after 7pm"
          }
        ]
      },
      {
        "url": "http://hl7.org/fhir/StructureDefinition/patient-birthPlace",
        "valueAddress": {
          "city": "Manchester",
          "district": "Greater Manchester",
          "country": "GBR"
        }
      },
      {
        "url": "https://fhir.nhs.uk/StructureDefinition/Extension-PDS-RemovalFromRegistration",
        "extension": [
          {
            "url": "removalFromRegistrationCode",
            "valueCodeableConcept": {
              "coding": [
                {
                  "system": "https://fhir.nhs.uk/CodeSystem/PDS-RemovalReasonExitCode",
                  "code": "SCT",
                  "display": "Transferred to Scotland"
                }
              ]
            }
          },
          {
            "url": "effectiveTime",
            "valuePeriod": {
              "start": "2020-01-01T00:00:00+00:00",
              "end": "2021-12-31T00:00:00+00:00"
            }
          }
        ]
      }
    ],
    "telecom": [
      {
        "id": "789",
        "period": {
          "start": "2020-01-01",
          "end": "2021-12-31"
        },
        "system": "phone",
        "value": "01632960587",
        "use": "home"
      },
      {
        "id": "790",
        "period": {
          "start": "2019-01-01",
          "end": "2022-12-31"
        },
        "system": "email",
        "value": "jane.smith@example.com",
        "use": "home"
      },
      {
        "id": "OC789",
        "period": {
          "start": "2020-01-01",
          "end": "2021-12-31"
        },
        "system": "other",
        "value": "01632960587",
        "use": "home",
        "extension": [
          {
            "url": "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-OtherContactSystem",
            "valueCoding": {
              "system": "https://fhir.hl7.org.uk/CodeSystem/UKCore-OtherContactSystem",
              "code": "textphone",
              "display": "Minicom (Textphone)"
            }
          }
        ]
      }
    ],
    "contact": [
      {
        "id": "C123",
        "period": {
          "start": "2020-01-01",
          "end": "2021-12-31"
        },
        "relationship": [
          {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/v2-0131",
                "code": "C",
                "display": "Emergency Contact"
              }
            ]
          }
        ],
        "telecom": [
          {
            "system": "phone",
            "value": "01632960587"
          }
        ]
      }
    ],
    "address": [
      {
        "id": "456",
        "period": {
          "start": "2020-01-01",
          "end": "2021-12-31"
        },
        "use": "home",
        "line": [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        "postalCode": "LS1 6AE",
        "extension": [
          {
            "url": "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-AddressKey",
            "extension": [
              {
                "url": "type",
                "valueCoding": {
                  "system": "https://fhir.hl7.org.uk/CodeSystem/UKCore-AddressKeyType",
                  "code": "PAF"
                }
              },
              {
                "url": "value",
                "valueString": "12345678"
              }
            ]
          },
          {
            "url": "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-AddressKey",
            "extension": [
              {
                "url": "type",
                "valueCoding": {
                  "system": "https://fhir.hl7.org.uk/CodeSystem/UKCore-AddressKeyType",
                  "code": "UPRN"
                }
              },
              {
                "url": "value",
                "valueString": "123456789012"
              }
            ]
          }
        ]
      },
      {
        "id": "T456",
        "period": {
          "start": "2020-01-01",
          "end": "2021-12-31"
        },
        "use": "temp",
        "text": "Student Accommodation",
        "line": [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        "postalCode": "LS1 6AE",
        "extension": [
          {
            "url": "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-AddressKey",
            "extension": [
              {
                "url": "type",
                "valueCoding": {
                  "system": "https://fhir.hl7.org.uk/CodeSystem/UKCore-AddressKeyType",
                  "code": "PAF"
                }
              },
              {
                "url": "value",
                "valueString": "12345678"
              }
            ]
          },
          {
            "url": "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-AddressKey",
            "extension": [
              {
                "url": "type",
                "valueCoding": {
                  "system": "https://fhir.hl7.org.uk/CodeSystem/UKCore-AddressKeyType",
                  "code": "UPRN"
                }
              },
              {
                "url": "value",
                "valueString": "123456789012"
              }
            ]
          }
        ]
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should successfully fetch and map patient details", async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: mockPdsBundle
    } as unknown as AxiosResponse )

    const result = await getPdsPatientDetails(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAxiosInstance as any, // Use type assertion to avoid TypeScript errors
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toMatchObject({
      nhsNumber: mockNhsNumber,
      given: "Jane",
      family: "Smith",
      prefix: "Mrs",
      suffix: "",
      gender: "female",
      dateOfBirth: "2010-10-22",
      address: {
        line1: "1 Trevelyan Square",
        line2: "Boar Lane",
        city: "Leeds",
        postcode: "LS1 6AE"
      }
    })

    expect(mockGet).toHaveBeenCalledWith(
      `${mockEndpoint}/Patient/${mockNhsNumber}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockAccessToken}`,
          "NHSD-Session-URID": mockRoleId
        })
      })
    )
  })

  it("should handle patient not found", async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: null
    } as unknown as AxiosResponse)

    const result = await getPdsPatientDetails(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toHaveProperty("_pdsError")
    expect(result._pdsError).toBeInstanceOf(PDSError)
    expect(result._pdsError?.message).toContain("Patient not found")
  })

  it("should detect and handle S-Flag", async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: {
        ...mockPdsBundle,
        meta: {
          security: [{code: "S"}]
        }
      }
    } as unknown as AxiosResponse)

    const result = await getPdsPatientDetails(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toHaveProperty("_pdsError")
    expect(result._pdsError).toBeInstanceOf(PDSError)
    expect(result._pdsError?.message).toContain("Prescription not found")
    expect((result._pdsError as PDSError).code).toBe("S_FLAG")
  })

  it("should detect and handle R-Flag", async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: {
        ...mockPdsBundle,
        meta: {
          security: [{code: "R"}]
        }
      }
    } as unknown as AxiosResponse)

    const result = await getPdsPatientDetails(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toHaveProperty("_pdsError")
    expect(result._pdsError).toBeInstanceOf(PDSError)
    expect(result._pdsError?.message).toContain("Prescription not found")
    expect((result._pdsError as PDSError).code).toBe("R_FLAG")
  })

  it("should handle superseded NHS numbers", async () => {
    const newNhsNumber = "8888888888"
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: {
        ...mockPdsBundle,
        id: newNhsNumber // Different NHS number than the requested one
      }
    } as unknown as AxiosResponse)

    const result = await getPdsPatientDetails(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toMatchObject({
      nhsNumber: newNhsNumber,
      supersededBy: newNhsNumber
    })
  })

  it("should handle incomplete patient data", async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: {
        id: mockNhsNumber
        // Missing name details
      }
    } as unknown as AxiosResponse)

    const result = await getPdsPatientDetails(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toHaveProperty("_pdsError")
    expect(result._pdsError).toBeInstanceOf(PDSError)
    expect(result._pdsError?.message).toContain("Incomplete patient data")
    expect((result._pdsError as PDSError).code).toBe("INCOMPLETE_DATA")
  })

  it("should handle API errors", async () => {
    mockGet.mockRejectedValueOnce(new Error("API Error"))

    const result = await getPdsPatientDetails(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toHaveProperty("_pdsError")
    expect(result._pdsError).toBeInstanceOf(PDSError)
    expect(result._pdsError?.message).toContain("Failed to fetch patient details")
  })
})
