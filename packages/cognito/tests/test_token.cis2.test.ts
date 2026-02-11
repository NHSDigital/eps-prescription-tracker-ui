/* eslint-disable no-console */
import {
  expect,
  describe,
  it,
  jest
} from "@jest/globals"

import createJWKSMock from "mock-jwks"
import nock from "nock"
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

const CIS2_OIDC_ISSUER = process.env.CIS2_OIDC_ISSUER
const CIS2_OIDC_CLIENT_ID = process.env.CIS2_OIDC_CLIENT_ID
const CIS2_OIDC_HOST = process.env.CIS2_OIDC_HOST ?? ""
//const CIS2_OIDCJWKS_ENDPOINT = process.env.CIS2_OIDCJWKS_ENDPOINT
//const CIS2_USER_INFO_ENDPOINT = process.env.CIS2_USER_INFO_ENDPOINT
const CIS2_USER_POOL_IDP = process.env.CIS2_USER_POOL_IDP
//const CIS2_IDP_TOKEN_PATH = process.env.CIS2_IDP_TOKEN_PATH ?? ""

//const MOCK_OIDC_ISSUER = process.env.MOCK_OIDC_ISSUER
//const MOCK_OIDC_CLIENT_ID = process.env.MOCK_OIDC_CLIENT_ID
//const MOCK_OIDC_HOST = process.env.MOCK_OIDC_HOST ?? ""
//const MOCK_OIDCJWKS_ENDPOINT = process.env.MOCK_OIDCJWKS_ENDPOINT
//const MOCK_USER_INFO_ENDPOINT = process.env.MOCK_USER_INFO_ENDPOINT
//const MOCK_USER_POOL_IDP = process.env.MOCK_USER_POOL_IDP
//const MOCK_IDP_TOKEN_PATH = process.env.MOCK_IDP_TOKEN_PATH

const mockVerifyIdToken = jest.fn()
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

const mockInsertTokenMapping = jest.fn()
const mockGetTokenMapping = jest.fn()
const mockTryGetTokenMapping = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    insertTokenMapping: mockInsertTokenMapping,
    getTokenMapping: mockGetTokenMapping,
    tryGetTokenMapping: mockTryGetTokenMapping
  }
})
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  const verifyIdToken = mockVerifyIdToken.mockImplementation(async () => {
    return {
      sub: "foo",
      exp: 100,
      at_hash: "session-id"
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

jest.unstable_mockModule("@aws-lambda-powertools/parameters/secrets", () => {
  const getSecret = mockGetSecret.mockImplementation(async () => {
    return privateKey
  })

  return {
    getSecret
  }
})

process.env.useMock = "false"
process.env.TokenMappingTableName = "test-token-mapping-table"
process.env.SessionManagementTableName = "test-session-management-table"
const {handler} = await import("../src/token")

describe("cis2 token handler", () => {
  const jwks = createJWKSMock("https://dummyauth.com/")
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    jwks.start()
  })

  afterEach(() => {
    jwks.stop()
  })

  it("inserts correct details into dynamo table", async () => {

    const expiryDate = Date.now() + 1000
    const token = jwks.token({
      iss: CIS2_OIDC_ISSUER,
      aud: CIS2_OIDC_CLIENT_ID,
      sub: "foo",
      exp: expiryDate
    })
    nock(CIS2_OIDC_HOST)
      .post("/token")
      .reply(200, {
        id_token: token,
        access_token: "access_token_reply"
      })

    const response = await handler({
      body: {
        foo: "bar"
      }
    }, dummyContext)
    expect(response.body).toMatch(JSON.stringify({
      id_token: token,
      access_token: "access_token_reply"
    }))
    expect(mockInsertTokenMapping).toHaveBeenCalledTimes(1)
    expect(mockInsertTokenMapping).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        username: `${CIS2_USER_POOL_IDP}_foo`,
        sessionId: "session-id",
        cis2IdToken: token,
        cis2ExpiresIn: "100",
        cis2AccessToken: "access_token_reply",
        selectedRoleId: undefined,
        lastActivityTime: expect.any(Number)
      },
      expect.anything()
    )
  })

  it("creates concurrent session when user exists and last activity < 15 minutes", async () => {
    // Mock tryGetTokenMapping to return existing user with recent activity
    mockTryGetTokenMapping.mockImplementationOnce(() => {
      return Promise.resolve({
        username: `${CIS2_USER_POOL_IDP}_foo`,
        lastActivityTime: Date.now() - (10 * 60 * 1000) // 10 minutes ago (less than 15)
      })
    })

    const expiryDate = Date.now() + 1000
    const token = jwks.token({
      iss: CIS2_OIDC_ISSUER,
      aud: CIS2_OIDC_CLIENT_ID,
      sub: "foo",
      exp: expiryDate
    })
    nock(CIS2_OIDC_HOST)
      .post("/token")
      .reply(200, {
        id_token: token,
        access_token: "access_token_reply"
      })

    const response = await handler({
      body: {
        foo: "bar"
      }
    }, dummyContext)

    expect(response.body).toMatch(JSON.stringify({
      id_token: token,
      access_token: "access_token_reply"
    }))

    // Should insert into token mapping table (concurrent session)
    expect(mockInsertTokenMapping).toHaveBeenCalledWith(
      expect.anything(),
      "test-token-mapping-table", // token mapping table
      {
        username: `${CIS2_USER_POOL_IDP}_foo`,
        sessionId: "session-id",
        cis2IdToken: token,
        cis2ExpiresIn: "100",
        cis2AccessToken: "access_token_reply",
        selectedRoleId: undefined,
        lastActivityTime: expect.any(Number)
      },
      expect.anything()
    )
  })

  it("inserts into token mapping table when user exists but last activity > 15 minutes", async () => {
    // Mock tryGetTokenMapping to return existing user with old activity
    mockTryGetTokenMapping.mockImplementationOnce(() => {
      return Promise.resolve({
        username: `${CIS2_USER_POOL_IDP}_foo`,
        lastActivityTime: Date.now() - (20 * 60 * 1000) // 20 minutes ago (more than 15)
      })
    })

    const expiryDate = Date.now() + 1000
    const token = jwks.token({
      iss: CIS2_OIDC_ISSUER,
      aud: CIS2_OIDC_CLIENT_ID,
      sub: "foo",
      exp: expiryDate
    })
    nock(CIS2_OIDC_HOST)
      .post("/token")
      .reply(200, {
        id_token: token,
        access_token: "access_token_reply"
      })

    const response = await handler({
      body: {
        foo: "bar"
      }
    }, dummyContext)

    expect(response.body).toMatch(JSON.stringify({
      id_token: token,
      access_token: "access_token_reply"
    }))

    // Should insert into token mapping table (not concurrent session)
    expect(mockInsertTokenMapping).toHaveBeenCalledWith(
      expect.anything(),
      "test-token-mapping-table", // token mapping table
      {
        username: `${CIS2_USER_POOL_IDP}_foo`,
        sessionId: "session-id",
        cis2IdToken: token,
        cis2ExpiresIn: "100",
        cis2AccessToken: "access_token_reply",
        selectedRoleId: undefined,
        lastActivityTime: expect.any(Number)
      },
      expect.anything()
    )
  })

  it("inserts into token mapping table when no existing user token mapping", async () => {
    // Mock tryGetTokenMapping to return undefined (no existing mapping)
    mockTryGetTokenMapping.mockImplementationOnce(() => {
      return Promise.resolve(undefined)
    })

    const expiryDate = Date.now() + 1000
    const token = jwks.token({
      iss: CIS2_OIDC_ISSUER,
      aud: CIS2_OIDC_CLIENT_ID,
      sub: "foo",
      exp: expiryDate
    })
    nock(CIS2_OIDC_HOST)
      .post("/token")
      .reply(200, {
        id_token: token,
        access_token: "access_token_reply"
      })

    const response = await handler({
      body: {
        foo: "bar"
      }
    }, dummyContext)

    expect(response.body).toMatch(JSON.stringify({
      id_token: token,
      access_token: "access_token_reply"
    }))

    // Should insert into token mapping table (new user)
    expect(mockInsertTokenMapping).toHaveBeenCalledWith(
      expect.anything(),
      "test-token-mapping-table", // token mapping table
      {
        username: `${CIS2_USER_POOL_IDP}_foo`,
        sessionId: "session-id",
        cis2IdToken: token,
        cis2ExpiresIn: "100",
        cis2AccessToken: "access_token_reply",
        selectedRoleId: undefined,
        lastActivityTime: expect.any(Number)
      },
      expect.anything()
    )
  })

  it("creates concurrent session when user exists and last activity exactly at 15 minute boundary", async () => {
    // Mock Date.now() to ensure consistent timing for boundary test
    const fixedTime = 1000000000000 // Fixed timestamp
    const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(fixedTime)

    const fifteenMinutes = 15 * 60 * 1000
    mockTryGetTokenMapping.mockImplementationOnce(() => {
      return Promise.resolve({
        username: `${CIS2_USER_POOL_IDP}_foo`,
        lastActivityTime: fixedTime - fifteenMinutes + 1 // Just barely within 15 minute window
      })
    })

    const expiryDate = Date.now() + 1000
    const token = jwks.token({
      iss: CIS2_OIDC_ISSUER,
      aud: CIS2_OIDC_CLIENT_ID,
      sub: "foo",
      exp: expiryDate
    })
    nock(CIS2_OIDC_HOST)
      .post("/token")
      .reply(200, {
        id_token: token,
        access_token: "access_token_reply"
      })

    const response = await handler({
      body: {
        foo: "bar"
      }
    }, dummyContext)

    expect(response.body).toMatch(JSON.stringify({
      id_token: token,
      access_token: "access_token_reply"
    }))

    // Should insert into token mapping table (concurrent session)
    expect(mockInsertTokenMapping).toHaveBeenCalledWith(
      expect.anything(),
      "test-token-mapping-table", // token mapping table
      expect.anything(),
      expect.anything()
    )

    // Restore Date.now
    dateNowSpy.mockRestore()
  })
})
