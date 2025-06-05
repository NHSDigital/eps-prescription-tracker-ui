import {
  expect,
  describe,
  it,
  jest
} from "@jest/globals"

import createJWKSMock from "mock-jwks"
import {generateKeyPairSync} from "crypto"
import jwksClient from "jwks-rsa"
import {OidcConfig} from "@cpt-ui-common/authFunctions"

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

const MOCK_OIDC_TOKEN_ENDPOINT = "https://internal-dev.api.service.nhs.uk/oauth2-mock/token"

const mockInitializeOidcConfig = jest.fn()
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

const mockUpdateTokenMapping = jest.fn()
const mockGetSessionState = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    updateTokenMapping: mockUpdateTokenMapping,
    getSessionState: mockGetSessionState
  }
})

const mockFetchUserInfo = jest.fn()
const mockExchangeTokenForApigeeAccessToken = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  const initializeOidcConfig = mockInitializeOidcConfig.mockImplementation( () => {
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
      tokenMappingTableName: process.env["TokenMappingTableName"] ?? "",
      oidcTokenEndpoint: process.env["CIS2_TOKEN_ENDPOINT"] ?? ""
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
      tokenMappingTableName: process.env["TokenMappingTableName"] ?? "",
      oidcTokenEndpoint: MOCK_OIDC_TOKEN_ENDPOINT
    }

    return {cis2OidcConfig, mockOidcConfig}
  })

  return {
    exchangeTokenForApigeeAccessToken: mockExchangeTokenForApigeeAccessToken,
    fetchUserInfo: mockFetchUserInfo,
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

const {handler} = await import("../src/tokenMock")

describe("token mock handler", () => {
  const jwks = createJWKSMock("https://dummy_mock_auth.com/")

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    jwks.start()
    // Set up required environment variables
    process.env.MOCK_USER_INFO_ENDPOINT = "https://dummy_mock_auth.com/userinfo"
    process.env.MOCK_OIDC_ISSUER = "https://dummy_mock_auth.com"
    process.env.MOCK_OIDC_CLIENT_ID = "test-client-id"
    process.env.MOCK_USER_POOL_IDP = "test-idp"
    process.env.TokenMappingTableName = "test-token-mapping-table"
    process.env.SessionStateMappingTableName = "test-session-state-table"
    process.env.FULL_CLOUDFRONT_DOMAIN = "test.cloudfront.net"
    process.env.jwtPrivateKeyArn = "test-private-key-arn"
    process.env.jwtKid = "test-kid"
    process.env.APIGEE_API_KEY = "test-api-key"
    process.env.APIGEE_API_SECRET = "test-api-secret"
  })

  afterEach(() => {
    jwks.stop()
  })

  it("inserts correct details into dynamo table", async () => {
    // return some valid data for the get command
    mockGetSessionState.mockImplementationOnce(() => {
      return Promise.resolve({
        LocalCode: "test-code",
        ApigeeCode: "apigee-code",
        SessionState: "test-session-state"
      })
    })

    mockExchangeTokenForApigeeAccessToken.mockReturnValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 3600
    })

    mockFetchUserInfo.mockImplementation(() => {
      return Promise.resolve({
        roles_with_access: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        roles_without_access: [],
        currently_selected_role: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        user_details: {
          family_name: "foo",
          given_name: "bar"
        }
      })
    })
    const response = await handler({
      body: "code=test-code",
      headers: {},
      requestContext: {
        requestId: "test-id"
      }
    }, dummyContext)

    // Check response structure
    expect(response.statusCode).toBe(200)
    expect(response.body).toBeDefined()
    const parsedBody = JSON.parse(response.body)
    expect(parsedBody).toStrictEqual({
      access_token: "unused",
      expires_in: 3600,
      id_token: expect.anything(),
      "not-before-policy": expect.anything(),
      refresh_expires_in: 600,
      refresh_token: "unused",
      scope: "openid associatedorgs profile nationalrbacaccess nhsperson email",
      session_state: "test-session-state",
      token_type: "Bearer"
    })
  })
})
