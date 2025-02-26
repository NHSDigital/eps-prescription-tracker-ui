import {
  expect,
  describe,
  it,
  jest
} from "@jest/globals"
import {generateKeyPairSync} from "crypto"
import nock from "nock"
import jwksClient from "jwks-rsa"

import createJWKSMock from "mock-jwks"
import {OidcConfig} from "@cpt-ui-common/authFunctions"
import {PatientAPIResponse, PrescriptionAPIResponse, TreatmentType} from "../src/types"

const apigeeHost = process.env.apigeeHost ?? ""
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
const mockInitializeOidcConfig = jest.fn()

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

  const updateApigeeAccessToken = mockUpdateApigeeAccessToken.mockImplementation(() => {})

  const initializeOidcConfig = mockInitializeOidcConfig.mockImplementation(() => {
    // Create a JWKS client for cis2 and mock
    const cis2JwksUri = process.env["CIS2_OIDCJWKS_ENDPOINT"] as string
    const cis2JwksClient = jwksClient({
      jwksUri: cis2JwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 3600000 // 1 hour
    })

    const cis2OidcConfig: OidcConfig = {
      oidcIssuer: process.env["CIS2_OIDC_ISSUER"] ?? "",
      oidcClientID: process.env["CIS2_OIDC_CLIENT_ID"] ?? "",
      oidcJwksEndpoint: process.env["CIS2_OIDCJWKS_ENDPOINT"] ?? "",
      oidcUserInfoEndpoint: process.env["CIS2_USER_INFO_ENDPOINT"] ?? "",
      userPoolIdp: process.env["CIS2_USER_POOL_IDP"] ?? "",
      jwksClient: cis2JwksClient,
      tokenMappingTableName: process.env["TokenMappingTableName"] ?? ""
    }

    const mockJwksUri = process.env["MOCK_OIDCJWKS_ENDPOINT"] as string
    const mockJwksClient = jwksClient({
      jwksUri: mockJwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 3600000 // 1 hour
    })

    const mockOidcConfig: OidcConfig = {
      oidcIssuer: process.env["MOCK_OIDC_ISSUER"] ?? "",
      oidcClientID: process.env["MOCK_OIDC_CLIENT_ID"] ?? "",
      oidcJwksEndpoint: process.env["MOCK_OIDCJWKS_ENDPOINT"] ?? "",
      oidcUserInfoEndpoint: process.env["MOCK_USER_INFO_ENDPOINT"] ?? "",
      userPoolIdp: process.env["MOCK_USER_POOL_IDP"] ?? "",
      jwksClient: mockJwksClient,
      tokenMappingTableName: process.env["TokenMappingTableName"] ?? ""
    }

    return {cis2OidcConfig, mockOidcConfig}
  })

  return {
    fetchAndVerifyCIS2Tokens,
    getUsernameFromEvent,
    constructSignedJWTBody,
    exchangeTokenForApigeeAccessToken,
    updateApigeeAccessToken,
    initializeOidcConfig
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

    // Set up nock for mocking HTTP requests
    nock(apigeeHost)
      .get("/prescriptionList")
      .query(true)
      .reply(200, {})
  })

  afterEach(() => {
    jwks.stop()
    nock.cleanAll()
  })

  // TODO: fix this test
  it.skip("responds with success", async () => {
    // Import handler here to make sure all mocks are set up first
    const {handler} = await import("../src/handler")

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
    // Import handler here to make sure all mocks are set up first
    const {handler} = await import("../src/handler")

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
    // Import handler here to make sure all mocks are set up first
    const {handler} = await import("../src/handler")

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
