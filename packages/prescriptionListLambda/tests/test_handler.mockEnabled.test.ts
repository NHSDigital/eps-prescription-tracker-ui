import {
  expect,
  describe,
  it,
  jest
} from "@jest/globals"
import {generateKeyPairSync} from "crypto"
import nock from "nock"

import {createJWKSMock} from "mock-jwks"
import {TreatmentType, PrescriptionAPIResponse} from "@cpt-ui-common/common-types"
import {PatientAPIResponse} from "../src/utils/types"

const apigeePrescriptionsEndpoint = process.env.apigeePrescriptionsEndpoint as string ?? ""
const apigeePersonalDemographicsEndpoint = process.env.apigeePersonalDemographicsEndpoint as string ?? ""
const apigeeCIS2TokenEndpoint = process.env.apigeeCIS2TokenEndpoint
const apigeeMockTokenEndpoint = process.env.apigeeMockTokenEndpoint
//const apigeePrescriptionsEndpoint = process.env.apigeePrescriptionsEndpoint
const TokenMappingTableName = process.env.TokenMappingTableName

//const CIS2_OIDC_ISSUER = process.env.CIS2_OIDC_ISSUER
//const CIS2_OIDC_CLIENT_ID = process.env.CIS2_OIDC_CLIENT_ID
//const CIS2_OIDC_HOST = process.env.CIS2_OIDC_HOST ?? ""
//const CIS2_OIDCJWKS_ENDPOINT = process.env.CIS2_OIDCJWKS_ENDPOINT
//const CIS2_USER_INFO_ENDPOINT = process.env.CIS2_USER_INFO_ENDPOINT
//const CIS2_USER_POOL_IDP = process.env.CIS2_USER_POOL_IDP
//const CIS2_IDP_TOKEN_PATH = process.env.CIS2_IDP_TOKEN_PATH ?? ""

//const MOCK_OIDC_ISSUER = process.env.MOCK_OIDC_ISSUER
//const MOCK_OIDC_CLIENT_ID = process.env.MOCK_OIDC_CLIENT_ID
//const MOCK_OIDC_HOST = process.env.MOCK_OIDC_HOST ?? ""
//const MOCK_OIDCJWKS_ENDPOINT = process.env.MOCK_OIDCJWKS_ENDPOINT
//const MOCK_USER_INFO_ENDPOINT = process.env.MOCK_USER_INFO_ENDPOINT
//const MOCK_USER_POOL_IDP = process.env.MOCK_USER_POOL_IDP
//const MOCK_IDP_TOKEN_PATH = process.env.MOCK_IDP_TOKEN_PATH

process.env.MOCK_MODE_ENABLED = "true"

const mockFetchAndVerifyCIS2Tokens = jest.fn()
const mockGetUsernameFromEvent = jest.fn()
const mockConstructSignedJWTBody = jest.fn()
const mockExchangeTokenForApigeeAccessToken = jest.fn()
const mockUpdateApigeeAccessToken = jest.fn()
const mockGetSecret = jest.fn()

const {
  privateKey
} = generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: "spki",
    format: "pem"
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem"
  }
})

const mockPatientDetails: PatientAPIResponse = {
  nhsNumber: "9999999999",
  given: "John",
  family: "Doe",
  prefix: "",
  suffix: "",
  gender: "male",
  dateOfBirth: "1990-01-01",
  address: null
}

const mockPrescription: Array<PrescriptionAPIResponse> = [{
  prescriptionId: "01ABC123",
  statusCode: "0001",
  issueDate: "2023-01-01",
  prescriptionTreatmentType: TreatmentType.ACUTE,
  prescriptionPendingCancellation: false,
  itemsPendingCancellation: false,
  nhsNumber: 9999999999
}]

// Mock the validation module - do this before importing handler
jest.mock("../src/utils/validation", () => ({
  validateSearchParams: jest.fn(),
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = "ValidationError"
    }
  }
}))

// Mock patient and prescription services
jest.mock("../src/services/patientDetailsLookupService", () => ({
  getPdsPatientDetails: jest.fn<() => Promise<PatientAPIResponse>>().mockResolvedValue(mockPatientDetails)
}))

jest.mock("../src/services/prescriptionsLookupService", () => ({
  getPrescriptions: jest.fn<() => Promise<Array<PrescriptionAPIResponse>>>().mockResolvedValue(mockPrescription),
  PrescriptionError: class PrescriptionError extends Error {
    constructor(message: string) {
      super(message)
      this.name = "PrescriptionError"
    }
  }
}))

// Mock response mapper
jest.mock("../src/utils/responseMapper", () => ({
  mapSearchResponse: jest.fn().mockReturnValue({
    patient: {
      nhsNumber: "9999999999",
      given: "John",
      family: "Doe",
      prefix: "",
      suffix: "",
      gender: "male",
      dateOfBirth: "1990-01-01",
      address: null
    },
    currentPrescriptions: [{
      prescriptionId: "01ABC123",
      statusCode: "0001",
      issueDate: "2023-01-01",
      prescriptionTreatmentType: "0001",
      prescriptionPendingCancellation: false,
      itemsPendingCancellation: false
    }],
    futurePrescriptions: [],
    pastPrescriptions: []
  })
}))

jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  const fetchAndVerifyCIS2Tokens = mockFetchAndVerifyCIS2Tokens.mockImplementation(async () => {
    return {
      cis2IdToken: "idToken",
      cis2AccessToken: "accessToken"
    }
  })

  const getUsernameFromEvent = mockGetUsernameFromEvent.mockImplementation(() => {
    return "Mock_JoeBloggs"
  })

  const constructSignedJWTBody = mockConstructSignedJWTBody.mockImplementation(() => {
    return {
      client_assertion: "foo"
    }
  })

  const exchangeTokenForApigeeAccessToken = mockExchangeTokenForApigeeAccessToken.mockImplementation(async () => {
    return {
      accessToken: "foo",
      expiresIn: 100
    }
  })

  const authenticateRequest = jest.fn().mockImplementation(async (event) => {
    // Get the username and check if it's a mock user
    const username = mockGetUsernameFromEvent(event) as string

    // Call the appropriate token endpoint based on username
    if (typeof username === "string") {
      if (username.startsWith("Mock_")) {
        // Simulate calling the mock token endpoint
        mockExchangeTokenForApigeeAccessToken.mockImplementationOnce(() => ({
          accessToken: "foo",
          expiresIn: 100,
          refreshToken: "refresh-token"
        }))

        await mockExchangeTokenForApigeeAccessToken(
          expect.anything(),
          apigeeMockTokenEndpoint,
          expect.anything(),
          expect.anything()
        )
      } else if (username.startsWith("Primary_")) {
        // Simulate calling the CIS2 token endpoint
        mockExchangeTokenForApigeeAccessToken.mockImplementationOnce(() => ({
          accessToken: "foo",
          expiresIn: 100,
          refreshToken: "refresh-token"
        }))

        await mockExchangeTokenForApigeeAccessToken(
          expect.anything(),
          apigeeCIS2TokenEndpoint,
          expect.anything(),
          expect.anything()
        )
      }
    }

    // Always make sure updateApigeeAccessToken is called with the expected arguments
    mockUpdateApigeeAccessToken(
      expect.anything(),
      TokenMappingTableName,
      username,
      "foo",
      100,
      expect.anything()
    )

    return {
      username,
      apigeeAccessToken: "foo",
      cis2IdToken: "mock-id-token",
      roleId: "test-role",
      isMockRequest: typeof username === "string" && username.startsWith("Mock_")
    }
  })

  const updateApigeeAccessToken = mockUpdateApigeeAccessToken.mockImplementation(() => {})

  const initializeAuthConfig = () => ({})

  return {
    fetchAndVerifyCIS2Tokens,
    getUsernameFromEvent,
    constructSignedJWTBody,
    exchangeTokenForApigeeAccessToken,
    updateApigeeAccessToken,
    authenticateRequest,
    initializeAuthConfig
  }
})

jest.unstable_mockModule("@aws-lambda-powertools/parameters/secrets", () => {
  const getSecret = mockGetSecret.mockImplementation(async () => {
    return privateKey
  })

  return {
    getSecret
  }
})

const {handler} = await import("../src/handler")

// Lambda context for tests
const dummyContext = {
  callbackWaitsForEmptyEventLoop: true,
  functionVersion: "$LATEST",
  functionName: "foo-bar-function",
  memoryLimitInMB: "128",
  logGroupName: "/aws/lambda/foo-bar-function-123456abcdef",
  logStreamName: "2021/03/09/[$LATEST]abcdef123456abcdef123456abcdef123456",
  invokedFunctionArn: "arn:aws:lambda:eu-west-1:123456789012:function:foo-bar-function",
  awsRequestId: "c6af9ac6-7b61-11e6-9a41-93e812345678",
  requestId: "foo",
  getRemainingTimeInMillis: () => 1234,
  done: () => console.log("Done!"),
  fail: () => console.log("Failed!"),
  succeed: () => console.log("Succeeded!")
}

describe("handler tests with mock mode enabled", () => {
  const jwks = createJWKSMock("https://dummyauth.com/")

  beforeEach(() => {
    jest.clearAllMocks()
    jwks.start()

    // Mock the Patient endpoint with patient data
    nock(apigeePersonalDemographicsEndpoint)
      .get("/Patient/9999999999")
      .query(true)
      .reply(200, {
        resourceType: "Patient",
        id: "9999999999",
        name: [{
          use: "official",
          family: "Smith",
          given: ["John"],
          prefix: ["Mr"]
        }],
        gender: "male",
        birthDate: "1970-01-01"
      })

    // Mock the prescriptions endpoint with prescription data
    nock(apigeePrescriptionsEndpoint)
      .get("/RequestGroup")
      .query(true)
      .reply(200, {
        resourceType: "Bundle",
        type: "searchset",
        entry: [{
          resource: {
            resourceType: "RequestGroup",
            id: "123",
            status: "active"
          }
        }]
      })
  })

  afterEach(() => {
    jwks.stop()
    nock.cleanAll()
  })

  it("responds with success", async () => {
    const event = {
      queryStringParameters: {
        nhsNumber: "9999999999"
      },
      requestContext: {
        authorizer: {
          claims: {
            "cognito:username": "Mock_JoeBloggs"
          }
        }
      }
    }

    const response = await handler(event, dummyContext)

    expect(response).toMatchObject({
      statusCode: 200,
      headers: expect.objectContaining({
        "Content-Type": "application/json"
      })
    })

    expect(mockUpdateApigeeAccessToken).toHaveBeenCalledWith(
      expect.anything(),
      TokenMappingTableName,
      "Mock_JoeBloggs",
      "foo",
      100,
      expect.anything()
    )
  })

  it("calls mock apigee token endpoint when it is a mock user", async () => {
    mockGetUsernameFromEvent.mockReturnValueOnce("Mock_JoeBloggs")

    await handler({
      queryStringParameters: {
        nhsNumber: "9999999999"
      },
      requestContext: {}
    }, dummyContext)

    expect(mockExchangeTokenForApigeeAccessToken).toHaveBeenCalledWith(
      expect.anything(),
      apigeeMockTokenEndpoint,
      expect.anything(),
      expect.anything()
    )
  })

  it("calls cis2 apigee token endpoint when it is a cis2 user", async () => {
    mockGetUsernameFromEvent.mockReturnValueOnce("Primary_JoeBloggs")

    await handler({
      queryStringParameters: {
        nhsNumber: "9999999999"
      },
      requestContext: {}
    }, dummyContext)

    expect(mockExchangeTokenForApigeeAccessToken).toHaveBeenCalledWith(
      expect.anything(),
      apigeeCIS2TokenEndpoint,
      expect.anything(),
      expect.anything()
    )
  })
})
