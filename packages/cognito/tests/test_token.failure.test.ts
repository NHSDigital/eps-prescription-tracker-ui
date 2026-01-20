/* eslint-disable no-console */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest"

import createJWKSMock from "mock-jwks"
import {generateKeyPairSync} from "crypto"
import jwksClient from "jwks-rsa"
import {OidcConfig} from "@cpt-ui-common/authFunctions"
import {handler} from "../src/token"

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

const {
  mockVerifyIdToken,
  mockInitializeOidcConfig,
  mockGetSecret,
  mockInsertTokenMapping,
  mockGetTokenMapping,
  mockTryGetTokenMapping
} = vi.hoisted(() => {
  return {
    mockVerifyIdToken: vi.fn(),
    mockInitializeOidcConfig: vi.fn(),
    mockGetSecret: vi.fn(),
    mockInsertTokenMapping: vi.fn(),
    mockGetTokenMapping: vi.fn(),
    mockTryGetTokenMapping: vi.fn()
  }
})

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
vi.mock("@cpt-ui-common/dynamoFunctions", () => {
  return {
    insertTokenMapping: mockInsertTokenMapping,
    getTokenMapping: mockGetTokenMapping,
    tryGetTokenMapping: mockTryGetTokenMapping
  }
})
vi.mock("@cpt-ui-common/authFunctions", () => {
  const verifyIdToken = mockVerifyIdToken.mockImplementation(async () => {
    return {
      sub: "foo",
      exp: 100
    }
  })

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
      sessionManagementTableName: process.env["SessionManagementTableName"] ?? "",
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
      sessionManagementTableName: process.env["SessionManagementTableName"] ?? "",
      oidcTokenEndpoint: process.env["MOCK_OIDC_TOKEN_ENDPOINT"] ?? ""
    }

    return {cis2OidcConfig, mockOidcConfig}
  })

  return {
    verifyIdToken,
    initializeOidcConfig
  }
})

vi.mock("@aws-lambda-powertools/parameters/secrets", () => {
  const getSecret = mockGetSecret.mockImplementation(async () => {
    return privateKey
  })

  return {
    getSecret
  }
})

describe("cis2 token handler tests - failures", () => {
  const jwks = createJWKSMock("https://dummyauth.com/")
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    jwks.start()
  })

  afterEach(() => {
    jwks.stop()
  })

  it("responds with error when body does not exist", async () => {

    const response = await handler({}, dummyContext)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })
  })
})
