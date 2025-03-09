import {
  FhirAction,
  FhirParticipant,
  ExtensionWithNested,
  Resource,
  Contact,
  DoHSValue,
  DoHSData,
  PrescriptionIntent,
  MergedResponse
} from "../src/utils/types"

export const mockAPIGatewayProxyEvent = {
  httpMethod: "POST",
  body: "",
  headers: {
    "nhsd-nhslogin-user": "P9:9912003071",
    "nhsd-correlation-id": "test-request-id.test-correlation-id.rrt-5789322914740101037-b-aet2-20145-482635-2",
    "x-request-id": "test-request-id",
    "nhsd-request-id": "test-request-id",
    "x-correlation-id": "test-correlation-id"
  },
  isBase64Encoded: false,
  multiValueHeaders: {},
  multiValueQueryStringParameters: {},
  path: "/hello",
  pathParameters: {},
  queryStringParameters: {},
  requestContext: {
    accountId: "123456789012",
    apiId: "1234",
    authorizer: {
      claims: {
        "cognito:username": "Mock_JoeBloggs"
      }
    },
    httpMethod: "POST",
    identity: {
      accessKey: "",
      accountId: "",
      apiKey: "",
      apiKeyId: "",
      caller: "",
      clientCert: {
        clientCertPem: "",
        issuerDN: "",
        serialNumber: "",
        subjectDN: "",
        validity: {
          notAfter: "",
          notBefore: ""
        }
      },
      cognitoAuthenticationProvider: "",
      cognitoAuthenticationType: "",
      cognitoIdentityId: "",
      cognitoIdentityPoolId: "",
      principalOrgId: "",
      sourceIp: "",
      user: "",
      userAgent: "",
      userArn: ""
    },
    path: "/",
    protocol: "HTTP/1.1",
    requestId: "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
    requestTimeEpoch: 1428582896000,
    resourceId: "123456",
    resourcePath: "/",
    stage: "dev"
  },
  resource: "",
  stageVariables: {}
}

export const mockContext = {
  callbackWaitsForEmptyEventLoop: true,
  functionVersion: "$LATEST",
  functionName: "foo-bar-function",
  memoryLimitInMB: "128",
  logGroupName: "/aws/lambda/foo-bar-function-123456abcdef",
  logStreamName: "2021/03/09/[$LATEST]abcdef123456abcdef123456abcdef123456",
  invokedFunctionArn:
    "arn:aws:lambda:eu-west-1:123456789012:function:foo-bar-function",
  awsRequestId: "c6af9ac6-7b61-11e6-9a41-93e812345678",
  getRemainingTimeInMillis: () => 1234,
  done: () => console.log("Done!"),
  fail: () => console.log("Failed!"),
  succeed: () => console.log("Succeeded!")
}

export const mockFhirParticipant: FhirParticipant = {
  identifier: {
    system: "https://fhir.nhs.uk/Id/ods-organization-code",
    value: "ODS123456"
  }
}

export const mockFhirAction: FhirAction = {
  participant: [mockFhirParticipant]
}

export const mockExtensionWithNested: ExtensionWithNested = {
  url: "http://example.com/fhir/extension",
  extension: [
    {
      url: "http://example.com/fhir/nested",
      valueInteger: 42,
      valueBoolean: true,
      valueCoding: {
        system: "http://example.com",
        code: "EX123",
        display: "Example Code"
      }
    }
  ]
}

export const mockResource: Resource = {
  resourceType: "MedicationRequest",
  intent: "order",
  status: "active",
  identifier: [
    {
      system: "http://example.com",
      value: "resource-identifier-001"
    }
  ],
  name: [
    {
      given: ["John"],
      family: "Doe"
    }
  ],
  gender: "male",
  birthDate: "1970-01-01",
  address: [
    {
      use: "home",
      type: "both",
      text: "123 Main St, CityName",
      line: ["123 Main St"],
      city: "CityName",
      district: "DistrictName",
      postalCode: "12345"
    }
  ],
  medicationCodeableConcept: {
    coding: [
      {
        system: "http://example.com",
        code: "MED123",
        display: "Medication A"
      }
    ]
  },
  groupIdentifier: {
    system: "http://example.com/group",
    value: "group-001"
  },
  code: {
    coding: [
      {
        system: "http://example.com/code",
        code: "CODE001",
        display: "Code Example"
      }
    ]
  },
  author: {
    reference: "Practitioner/1",
    identifier: {
      system: "http://example.com/author",
      value: "author-001"
    }
  },
  extension: [mockExtensionWithNested],
  dosageInstruction: [
    {
      text: "Take one tablet daily"
    }
  ],
  dispenseRequest: {
    quantity: {
      value: 30
    }
  },
  businessStatus: {
    coding: [
      {
        system: "http://example.com/status",
        code: "active",
        display: "Active"
      }
    ]
  },
  output: [
    {
      type: {
        coding: [
          {
            system: "http://example.com/output",
            code: "output-001",
            display: "Output"
          }
        ]
      },
      valueReference: {
        reference: "Observation/1"
      }
    }
  ],
  authoredOn: "2020-01-01T00:00:00Z"
}

export const mockContact: Contact = {
  ContactType: "Primary",
  ContactAvailabilityType: "9-5",
  ContactMethodType: "phone",
  ContactValue: "123-456-7890"
}

export const mockDoHSValue: DoHSValue = {
  OrganisationName: "NHS Test Organisation",
  ODSCode: "ODS123",
  Address1: "456 Health St",
  City: "TestCity",
  Postcode: "TS1 2AB",
  Contacts: [mockContact]
}

export const mockDoHSData: DoHSData = {
  prescribingOrganization: mockDoHSValue,
  nominatedPerformer: mockDoHSValue,
  dispensingOrganizations: [mockDoHSValue]
}

export const mockPrescriptionIntent: PrescriptionIntent = "order"

export const mockMergedResponse: MergedResponse = {
  patientDetails: {
    identifier: "patient-123",
    name: {
      prefix: "Mr.",
      given: "John",
      family: "Doe"
    },
    gender: "male",
    birthDate: "1970-01-01",
    address: {
      text: "123 Main St, CityName, Country",
      line: "123 Main St",
      city: "CityName",
      district: "DistrictName",
      postalCode: "12345",
      type: "home",
      use: "primary"
    }
  },
  prescriptionID: "RX-123456",
  typeCode: "order",
  statusCode: "active",
  issueDate: "2020-01-01",
  instanceNumber: 1,
  maxRepeats: 3,
  daysSupply: "30",
  prescriptionPendingCancellation: false,
  prescribedItems: [
    {
      itemDetails: {
        medicationName: "Medication A",
        quantity: "30 tablets",
        dosageInstructions: "Take one tablet daily",
        epsStatusCode: "EPS123",
        itemPendingCancellation: false,
        cancellationReason: null
      }
    }
  ],
  dispensedItems: [
    {
      itemDetails: {
        medicationName: "Medication A",
        quantity: "30 tablets",
        dosageInstructions: "Take one tablet daily",
        epsStatusCode: "EPS123",
        itemPendingCancellation: false,
        cancellationReason: null,
        notDispensedReason: null,
        initiallyPrescribed: {
          medicationName: "Medication A",
          quantity: "30 tablets",
          dosageInstructions: "Take one tablet daily"
        }
      }
    }
  ],
  messageHistory: [
    {
      messageCode: "MSG001",
      sentDateTime: "2020-01-02T00:00:00Z",
      organisationName: "NHS Test Organisation",
      organisationODS: "ODS123",
      newStatusCode: "processed",
      dispenseNotification: [
        {
          ID: "DN001",
          medicationName: "Medication A",
          quantity: "30 tablets",
          dosageInstruction: "Take one tablet daily"
        }
      ]
    }
  ],
  prescriberOrganisation: {
    organisationSummaryObjective: {
      name: "NHS Prescriber Org",
      odsCode: "ODS123",
      address: "456 Health St, TestCity",
      telephone: "123-456-7890",
      prescribedFrom: "General Practice"
    }
  },
  nominatedDispenser: {
    organisationSummaryObjective: {
      name: "NHS Nominated Dispenser",
      odsCode: "ODS456",
      address: "789 Pharmacy Rd, TestCity",
      telephone: "098-765-4321"
    }
  },
  currentDispenser: [
    {
      organisationSummaryObjective: {
        name: "NHS Current Dispenser One",
        odsCode: "ODS789",
        address: "101 Pharmacy Ave, TestCity",
        telephone: "111-222-3333"
      }
    },
    {
      organisationSummaryObjective: {
        name: "NHS Current Dispenser Two",
        odsCode: "ODS912",
        address: "202 Pharmacy Ave, TestCity",
        telephone: "999-222-3333"
      }
    }
  ]
}
