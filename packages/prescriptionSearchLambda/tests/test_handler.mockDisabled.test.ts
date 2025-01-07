import {
  expect,
  describe,
  it,
  jest
} from "@jest/globals"
import {generateKeyPairSync} from "crypto"
import nock from "nock"

import createJWKSMock from "mock-jwks"

const apigeeHost = process.env.apigeeHost ?? ""
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

  return {
    fetchAndVerifyCIS2Tokens,
    getUsernameFromEvent,
    constructSignedJWTBody,
    exchangeTokenForApigeeAccessToken,
    updateApigeeAccessToken
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
    nock(apigeeHost)
      .get("/prescriptions")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .query(_ => {
      // handle any query string
        return true
      })
      .reply(200, {
        prescription: "123"
      })
  })

  afterEach(() => {
    jwks.stop()
  })

  it("responds with success", async () => {

    const response = await handler({
      requestContext: {
        authorizer: {
          claims: {
            "cognito:username": "Mock_JoeBloggs"
          }
        }
      }
    }, dummyContext)
    const responseBody = JSON.parse(response.body)

    expect(response).toMatchObject({
      statusCode: 200
    })

    expect(responseBody).toMatchObject({
      prescription: "123"
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

  it("returns error when it is a mock user", async () => {
    mockGetUsernameFromEvent.mockImplementation(() => {
      return "Mock_JoeBloggs"
    })

    const response = await handler({
      requestContext: {}
    }, dummyContext)

    const responseBody = JSON.parse(response.body)

    expect(response).toMatchObject({
      statusCode: 500
    })

    expect(responseBody).toMatchObject({
      "details": "Trying to use a mock user when mock mode is disabled",
      "message": "Failed to fetch prescription data from Apigee API"
    })
  })

  it("calls cis2 apigee token endpoint when it is a cis2 user", async () => {
    mockGetUsernameFromEvent.mockImplementation(() => {
      return "Primary_JoeBloggs"
    })

    await handler({
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
