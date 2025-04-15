import {
  expect,
  describe,
  it,
  jest
} from "@jest/globals"
import {generateKeyPairSync} from "crypto"
import nock from "nock"

import createJWKSMock from "mock-jwks"
import jwksClient from "jwks-rsa"
import {OidcConfig} from "@cpt-ui-common/authFunctions"

import {Logger} from "@aws-lambda-powertools/logger"
import {mockPdsPatient, mockPrescriptionBundle} from "./mockObjects"

const apigeePrescriptionsEndpoint = process.env.apigeePrescriptionsEndpoint as string ?? ""
const apigeePersonalDemographicsEndpoint = process.env.apigeePersonalDemographicsEndpoint as string ?? ""
const apigeeCIS2TokenEndpoint = process.env.apigeeCIS2TokenEndpoint
//const apigeeMockTokenEndpoint = process.env.apigeeMockTokenEndpoint
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

process.env.MOCK_MODE_ENABLED = "false"

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
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  const fetchAndVerifyCIS2Tokens = mockFetchAndVerifyCIS2Tokens.mockImplementation(async () => {
    return {
      cis2IdToken: "idToken",
      cis2AccessToken: "accessToken"
    }
  })

  const getUsernameFromEvent = mockGetUsernameFromEvent.mockImplementation(() => {
    return "Primary_JoeBloggs"
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
    // this is outside functions so it can be re-used
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

const {handler} = await import("../src/handler")

// redefining readonly property of the performance object
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

describe("handler tests with cis2 auth", () => {
  const jwks = createJWKSMock("https://dummyauth.com/")
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    jwks.start()
    // Mock the Patient endpoint with patient data
    nock(apigeePersonalDemographicsEndpoint)
      .get("/Patient/9000000009")
      .query(true)
      .reply(200, mockPdsPatient
      )

    // Mock the prescriptions endpoint with prescription data
    nock(apigeePrescriptionsEndpoint)
      .get("/RequestGroup")
      .query(true)
      .reply(200, mockPrescriptionBundle)
  })

  afterEach(() => {
    jwks.stop()
  })

  it("responds with success", async () => {

    const event = {
      queryStringParameters: {
        nhsNumber: "9000000009"
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
    const responseBody = JSON.parse(response.body)

    expect(response).toMatchObject({
      statusCode: 200
    })

    expect(responseBody).toMatchObject({
      "currentPrescriptions": [{
        "issueDate": "2023-01-01",
        "itemsPendingCancellation": false,
        "nhsNumber": 9999999999,
        "prescriptionId": "01ABC123",
        "prescriptionPendingCancellation": false,
        "prescriptionTreatmentType": "0001",
        "statusCode": "0001"
      }],
      "futurePrescriptions": [],
      "pastPrescriptions": [],
      "patient": {
        "address": {
          "city": "Leeds",
          "line1": "1 Trevelyan Square",
          "line2": "Boar Lane",
          "postcode": "LS1 6AE"
        },
        "dateOfBirth": "2010-10-22",
        "family": "Smith",
        "gender": "female",
        "given": "Jane",
        "nhsNumber": "9000000009",
        "prefix": "Mrs",
        "suffix": ""
      }
    })

    expect(mockUpdateApigeeAccessToken).toBeCalledWith(
      expect.any(Object),
      TokenMappingTableName,
      "Mock_JoeBloggs",
      "foo",
      100,
      expect.any(Object)
    )
  })

  it("throw error when it is a mock user", async () => {
    mockGetUsernameFromEvent.mockImplementation(() => {
      return "Mock_JoeBloggs"
    })
    const loggerSpy = jest.spyOn(Logger.prototype, "error")

    const response = await handler({
      queryStringParameters: {
        nhsNumber: "9999999999"
      },
      requestContext: {}
    }, dummyContext)

    expect(response).toMatchObject({
      message: "A system error has occurred"
    })
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "Error: Trying to use a mock user when mock mode is disabled"
    )
  })

  it("calls cis2 apigee token endpoint when it is a cis2 user", async () => {
    mockGetUsernameFromEvent.mockImplementation(() => {
      return "Primary_JoeBloggs"
    })

    await handler({
      queryStringParameters: {
        nhsNumber: "9999999999"
      },
      requestContext: {}
    }, dummyContext)

    expect(mockExchangeTokenForApigeeAccessToken).toBeCalledWith(
      expect.any(Function),
      apigeeCIS2TokenEndpoint,
      expect.any(Object),
      expect.any(Object)
    )
  })
})
