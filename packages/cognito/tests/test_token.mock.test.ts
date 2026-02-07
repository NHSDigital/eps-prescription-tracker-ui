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
import {handler} from "../src/tokenMock"

const {
  mockInitializeOidcConfig,
  mockGetSecret,
  mockInsertTokenMapping,
  mockTryGetTokenMapping,
  mockFetchUserInfo,
  mockExchangeTokenForApigeeAccessToken
} = vi.hoisted(() => {
  return {
    mockInitializeOidcConfig: vi.fn(),
    mockGetSecret: vi.fn(),
    mockInsertTokenMapping: vi.fn().mockName("mockInsertTokenMapping"),
    mockTryGetTokenMapping: vi.fn().mockName("mockTryGetTokenMapping"),
    mockFetchUserInfo: vi.fn().mockName("mockFetchUserInfo"),
    mockExchangeTokenForApigeeAccessToken: vi.fn().mockName("mockExchangeTokenForApigeeAccessToken")
  }
})

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
    tryGetTokenMapping: mockTryGetTokenMapping
  }
})

vi.mock("@cpt-ui-common/authFunctions", () => {
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
    const MOCK_OIDC_TOKEN_ENDPOINT = "https://internal-dev.api.service.nhs.uk/oauth2-mock/token"

    const mockOidcConfig: OidcConfig = {
      oidcIssuer: process.env["MOCK_OIDC_ISSUER"] ?? "",
      oidcClientID: process.env["MOCK_OIDC_CLIENT_ID"] ?? "",
      oidcJwksEndpoint: process.env["MOCK_OIDCJWKS_ENDPOINT"] ?? "",
      oidcUserInfoEndpoint: process.env["MOCK_USER_INFO_ENDPOINT"] ?? "",
      userPoolIdp: process.env["MOCK_USER_POOL_IDP"] ?? "",
      jwksClient: mockJwksClient,
      tokenMappingTableName: process.env["TokenMappingTableName"] ?? "",
      sessionManagementTableName: process.env["SessionManagementTableName"] ?? "",
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

vi.mock("@aws-lambda-powertools/parameters/secrets", () => {
  const getSecret = mockGetSecret.mockImplementation(async () => {
    return privateKey
  })

  return {
    getSecret
  }
})

describe("token mock handler", () => {
  const jwks = createJWKSMock("https://dummy_mock_auth.com/")

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    jwks.start()
  })

  afterEach(() => {
    jwks.stop()
  })

  it("inserts correct details into dynamo table", async () => {
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
          given_name: "bar",
          sub: "user_details_sub"
        }
      })
    })

    const response = await handler({
      body: "code=test-code&session_state=test-session-state",
      headers: {},
      requestContext: {
        requestId: "test-id"
      }
    }, dummyContext)

    // check call
    expect(mockInsertTokenMapping).toHaveBeenCalledWith(
      expect.anything(), // documentClient
      expect.anything(), // tableName
      {
        username: "Mock_user_details_sub",
        apigeeAccessToken: "new-access-token",
        apigeeRefreshToken: "new-refresh-token",
        apigeeExpiresIn: 3600,
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [],
        currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        userDetails: {
          family_name: "foo",
          given_name: "bar",
          sub: "user_details_sub"
        },
        lastActivityTime: expect.any(Number),
        sessionId: expect.any(String)
      }, // item
      expect.anything() // logger
    )
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
      scope: "openid associatedorgs profile nationalrbacaccess nhsperson",
      session_state: "test-session-state",
      token_type: "Bearer"
    })
  })

  it("inserts concurrent session details into sessionManagement dynamo table", async () => {
    // return some valid data for the get command
    mockTryGetTokenMapping.mockImplementation(() => {
      return Promise.resolve({
        username: "Mock_user_details_sub",
        lastActivityTime: Date.now()
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
          given_name: "bar",
          sub: "user_details_sub"
        },
        sessionId: "mock-uuid"
      })
    })

    const response = await handler({
      body: "code=test-code&session_state=test-session-state",
      headers: {},
      requestContext: {
        requestId: "test-id"
      }
    }, dummyContext)

    // check call
    expect(mockInsertTokenMapping).toHaveBeenCalledWith(
      expect.anything(), // documentClient
      "test-session-management-table", // tableName
      {
        username: "Mock_user_details_sub",
        apigeeAccessToken: "new-access-token",
        apigeeRefreshToken: "new-refresh-token",
        apigeeExpiresIn: 3600,
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [],
        currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        userDetails: {
          family_name: "foo",
          given_name: "bar",
          sub: "user_details_sub"
        },
        lastActivityTime: expect.any(Number),
        sessionId: expect.any(String)
      }, // item
      expect.anything() // logger
    )
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
      scope: "openid associatedorgs profile nationalrbacaccess nhsperson",
      session_state: "test-session-state",
      token_type: "Bearer"
    })
  })

  it("inserts session details into token mapping table if lastActivityTime > 15 mins", async () => {
    // return some valid data for the get command
    mockTryGetTokenMapping.mockImplementation(() => {
      return Promise.resolve({
        username: "Mock_user_details_sub",
        lastActivityTime: Date.now() - (16 * 60 * 1000) // 16 minutes ago
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
          given_name: "bar",
          sub: "user_details_sub"
        },
        sessionId: "mock-uuid"
      })
    })

    const response = await handler({
      body: "code=test-code&session_state=test-session-state",
      headers: {},
      requestContext: {
        requestId: "test-id"
      }
    }, dummyContext)

    // check call
    expect(mockInsertTokenMapping).toHaveBeenCalledWith(
      expect.anything(), // documentClient
      "dummyTable", // tableName
      {
        username: "Mock_user_details_sub",
        apigeeAccessToken: "new-access-token",
        apigeeRefreshToken: "new-refresh-token",
        apigeeExpiresIn: 3600,
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [],
        currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        userDetails: {
          family_name: "foo",
          given_name: "bar",
          sub: "user_details_sub"
        },
        lastActivityTime: expect.any(Number),
        sessionId: expect.any(String)
      }, // item
      expect.anything() // logger
    )
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
      scope: "openid associatedorgs profile nationalrbacaccess nhsperson",
      session_state: "test-session-state",
      token_type: "Bearer"
    })
  })

  it("returns error response when code parameter is missing from body", async () => {
    const result = await handler({
      body: "", // empty body
      headers: {},
      requestContext: {
        requestId: "test-id"
      }
    }, dummyContext)

    expect(result).toEqual({
      message: "A system error has occurred"
    })
  })

  it("returns error response when code parameter is missing entirely", async () => {
    const result = await handler({
      body: "other=value", // no code parameter
      headers: {},
      requestContext: {
        requestId: "test-id"
      }
    }, dummyContext)

    expect(result).toEqual({
      message: "A system error has occurred"
    })
  })

  it("handles PR domain correctly by replacing pull request segments", async () => {
    // Set up a PR domain
    const originalDomain = process.env["FULL_CLOUDFRONT_DOMAIN"]
    process.env["FULL_CLOUDFRONT_DOMAIN"] = "test-pr-123.cloudfront.net"

    mockExchangeTokenForApigeeAccessToken.mockReturnValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 3600
    })

    mockFetchUserInfo.mockImplementation(() => {
      return Promise.resolve({
        roles_with_access: [],
        roles_without_access: [],
        currently_selected_role: null,
        user_details: {
          family_name: "foo",
          given_name: "bar",
          sub: "user_details_sub"
        }
      })
    })

    await handler({
      body: "code=test-code&session_state=test-session-state",
      headers: {},
      requestContext: {
        requestId: "test-id"
      }
    }, dummyContext)

    // Verify that exchangeTokenForApigeeAccessToken was called with the base domain (without PR segment)
    expect(mockExchangeTokenForApigeeAccessToken).toHaveBeenCalledWith(
      expect.anything(),
      "https://internal-dev.api.service.nhs.uk/oauth2-mock/token",
      expect.objectContaining({
        redirect_uri: "https://cpt-ui.dev.eps.national.nhs.uk/oauth2/mock-callback" // PR part removed
      }),
      expect.anything()
    )

    // Restore original domain
    process.env["FULL_CLOUDFRONT_DOMAIN"] = originalDomain
  })

  it("handles undefined existingTokenMapping correctly", async () => {
    mockTryGetTokenMapping.mockImplementation(() => {
      return Promise.resolve(undefined) // No existing mapping
    })

    mockExchangeTokenForApigeeAccessToken.mockReturnValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 3600
    })

    mockFetchUserInfo.mockImplementation(() => {
      return Promise.resolve({
        roles_with_access: [],
        roles_without_access: [],
        currently_selected_role: null,
        user_details: {
          family_name: "foo",
          given_name: "bar",
          sub: "user_details_sub"
        }
      })
    })

    await handler({
      body: "code=test-code&session_state=test-session-state",
      headers: {},
      requestContext: {
        requestId: "test-id"
      }
    }, dummyContext)

    // Should insert into token mapping table (not session management table)
    expect(mockInsertTokenMapping).toHaveBeenCalledWith(
      expect.anything(),
      "dummyTable", // Should use token mapping table
      expect.anything(),
      expect.anything()
    )
  })
})
