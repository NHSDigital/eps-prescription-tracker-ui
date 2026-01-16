import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest"
import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {AxiosInstance} from "axios"
import {authenticateRequest} from "../src/authenticateRequest"

const {
  mockJwtDecode,
  mockJwtVerify,
  mockJwtSign,
  mockGetSecret,
  mockGetUsernameFromEvent,
  mockRefreshApigeeAccessToken,
  mockExchangeTokenForApigeeAccessToken,
  mockConstructSignedJWTBody,
  mockDecodeToken,
  mockVerifyIdToken,
  mockUpdateTokenMapping,
  mockGetTokenMapping,
  mockDeleteTokenMapping
} = vi.hoisted(() => {
  const jwtPayload = {
    sub: "test-subject",
    exp: Math.floor(Date.now() / 1000) + 3600,
    acr: "AAL3_ANY"
  }

  return {
    mockJwtDecode: vi.fn().mockReturnValue({
      header: {kid: "test-kid"},
      payload: jwtPayload
    }),
    mockJwtVerify: vi.fn().mockReturnValue(jwtPayload),
    mockJwtSign: vi.fn().mockReturnValue("signed-jwt-token"),
    mockGetSecret: vi.fn().mockReturnValue("test-private-key"),
    mockGetUsernameFromEvent: vi.fn().mockName("mockGetUsernameFromEvent"),
    mockRefreshApigeeAccessToken: vi.fn().mockName("mockRefreshApigeeAccessToken"),
    mockExchangeTokenForApigeeAccessToken: vi.fn().mockName("mockExchangeTokenForApigeeAccessToken"),
    mockConstructSignedJWTBody: vi.fn().mockName("mockConstructSignedJWTBody"),
    mockDecodeToken: vi.fn().mockName("mockDecodeToken"),
    mockVerifyIdToken: vi.fn().mockName("mockVerifyIdToken"),
    mockUpdateTokenMapping: vi.fn(),
    mockGetTokenMapping: vi.fn(),
    mockDeleteTokenMapping: vi.fn()
  }
})

vi.mock("jsonwebtoken", () => ({
  default: {
    decode: mockJwtDecode,
    verify: mockJwtVerify,
    sign: mockJwtSign
  },
  decode: mockJwtDecode,
  verify: mockJwtVerify,
  sign: mockJwtSign
}))

vi.mock("@aws-lambda-powertools/parameters/secrets", () => ({
  getSecret: mockGetSecret
}))

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)
const axiosInstance = {
  post: vi.fn().mockReturnValue({data: {}}),
  get: vi.fn().mockReturnValue({data: {}})
} as unknown as AxiosInstance

vi.mock("@cpt-ui-common/dynamoFunctions", () => ({
  updateTokenMapping: mockUpdateTokenMapping,
  getTokenMapping: mockGetTokenMapping,
  deleteTokenMapping: mockDeleteTokenMapping
}))

vi.mock("../src/index", () => ({
  getUsernameFromEvent: mockGetUsernameFromEvent,
  refreshApigeeAccessToken: mockRefreshApigeeAccessToken,
  exchangeTokenForApigeeAccessToken: mockExchangeTokenForApigeeAccessToken,
  constructSignedJWTBody: mockConstructSignedJWTBody,
  decodeToken: mockDecodeToken,
  verifyIdToken: mockVerifyIdToken
}))

describe("authenticateRequest", () => {
  // Common test setup

  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  } as unknown as Logger

  const mockOptions = {
    tokenMappingTableName: "test-table",
    sessionManagementTableName: "test-session-table",
    jwtPrivateKeyArn: "test-key-arn",
    apigeeApiKey: "test-api-key",
    jwtKid: "test-kid",
    apigeeApiSecret: "test-api-secret",
    apigeeMockTokenEndpoint: "mock-token-endpoint",
    apigeeCis2TokenEndpoint: "cis2-token-endpoint",
    cloudfrontDomain: "test-cloudfront-domain"
  }

  const dependencies = {
    axiosInstance,
    ddbClient: documentClient,
    logger: mockLogger,
    authOptions: mockOptions
  }

  beforeEach(() => {
    // Clear all mock implementations
    vi.clearAllMocks()

    // Set up default mocks for all tests
    mockGetUsernameFromEvent.mockReturnValue("test-user")

    // Default mock for constructSignedJWTBody
    mockConstructSignedJWTBody.mockReturnValue({param: "value"})

    // Ensure process.env is populated
    process.env.APIGEE_API_SECRET = "test-api-secret"
  })

  it("should use existing valid token when available", async () => {
    // Set up mock implementation for this test

    const token = {
      username: "test-user",
      apigeeAccessToken: "existing-token",
      cis2IdToken: "existing-cis2-token",
      cis2AccessToken: "existing-cis2-access-token",
      apigeeExpiresIn: Math.floor(Date.now() / 1000) + 1000,
      currentlySelectedRole: {
        role_id: "existing-role-id",
        org_code: "existing_org"
      },
      lastActivityTime: Date.now()
    }
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve(token))

    const result = await authenticateRequest(
      "test-user",
      dependencies,
      token,
      mockOptions.tokenMappingTableName,
      false
    )

    expect(result).toEqual({
      apigeeAccessToken: "existing-token",
      roleId: "existing-role-id",
      orgCode: "existing_org",
      username: "test-user"
    })

    expect(mockUpdateTokenMapping).toHaveBeenCalledWith(
      documentClient,
      mockOptions.tokenMappingTableName,
      {username: "test-user", lastActivityTime: expect.any(Number)},
      mockLogger
    )

    // Verify that token refresh functions were not called
    expect(mockRefreshApigeeAccessToken).not.toHaveBeenCalled()
  })

  it("should return null if record was inactive for more than 15 minutes", async () => {
    const token = {
      username: "test-user",
      apigeeAccessToken: "existing-token",
      cis2IdToken: "existing-cis2-token",
      cis2AccessToken: "existing-cis2-access-token",
      apigeeExpiresIn: Math.floor(Date.now() / 1000) + 1000,
      currentlySelectedRole: {
        role_id: "existing-role-id",
        org_code: "existing_org"
      },
      lastActivityTime: Date.now() - 16 * 60 * 1000 // 16 minutes ago
    }

    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve(token))

    const result = await authenticateRequest(
      "test-user",
      dependencies,
      token,
      mockOptions.tokenMappingTableName,
      false
    )

    expect(result).toBeNull()

    expect(mockDeleteTokenMapping).toHaveBeenCalledWith(
      documentClient,
      mockOptions.tokenMappingTableName,
      "test-user",
      mockLogger
    )
  })

  it("should refresh token when it's about to expire", async () => {
    // Set up mock implementations for this test
    const token = {
      username: "test-user",
      apigeeAccessToken: "expiring-token",
      cis2IdToken: "expiring-cis2-token",
      cis2AccessToken: "expiring-cis2-access-token",
      apigeeRefreshToken: "expiring-refresh-token",
      apigeeExpiresIn: Math.floor(Date.now() / 1000) + 30, // expires in 30 seconds
      currentlySelectedRole: {
        role_id: "existing-role-id",
        org_code: "existing_org"
      },
      lastActivityTime: Date.now()
    }
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve(token))

    mockRefreshApigeeAccessToken.mockReturnValue({
      accessToken: "refreshed-token",
      idToken: "refreshed-cis2-token",
      refreshToken: "refreshed-refresh-token",
      expiresIn: 3600
    })

    const result = await authenticateRequest(
      "test-user",
      dependencies,
      token,
      mockOptions.tokenMappingTableName,
      false
    )

    expect(result).toEqual({
      apigeeAccessToken: "refreshed-token",
      roleId: "existing-role-id",
      orgCode: "existing_org",
      username: "test-user"
    })

    // Verify refresh was called with correct params
    expect(mockRefreshApigeeAccessToken).toHaveBeenCalledWith(
      axiosInstance,
      mockOptions.apigeeCis2TokenEndpoint, // Use the one from options
      "expiring-refresh-token",
      mockOptions.apigeeApiKey,
      "test-api-secret", // API secret from env var
      mockLogger
    )

    // Verify token was updated in DB
    expect(mockUpdateTokenMapping).toHaveBeenCalledWith(
      documentClient,
      mockOptions.tokenMappingTableName,
      {
        "apigeeAccessToken": "refreshed-token",
        "apigeeExpiresIn": 3600,
        "apigeeRefreshToken": "refreshed-refresh-token",
        "username": "test-user",
        "lastActivityTime": expect.any(Number)
      },
      mockLogger
    )
  })

  it("shouldn't update lastActivityTime if disableLastActivityUpdate is true", async () => {
    // Set up mock implementations for this test
    const lastActivityTime = Date.now() - 14 * 60 * 1000 // 5 minutes ago

    const token = {
      username: "test-user",
      apigeeAccessToken: "expiring-token",
      cis2IdToken: "expiring-cis2-token",
      cis2AccessToken: "expiring-cis2-access-token",
      apigeeRefreshToken: "expiring-refresh-token",
      apigeeExpiresIn: Math.floor(Date.now() / 1000) + 30, // expires in 30 seconds
      currentlySelectedRole: {
        role_id: "existing-role-id",
        org_code: "existing_org"
      },
      lastActivityTime: lastActivityTime
    }
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve(token))

    mockRefreshApigeeAccessToken.mockReturnValue({
      accessToken: "refreshed-token",
      idToken: "refreshed-cis2-token",
      refreshToken: "refreshed-refresh-token",
      expiresIn: 3600
    })

    const result = await authenticateRequest(
      "test-user",
      dependencies,
      token,
      mockOptions.tokenMappingTableName,
      true
    )

    expect(result).toEqual({
      apigeeAccessToken: "refreshed-token",
      roleId: "existing-role-id",
      orgCode: "existing_org",
      username: "test-user"
    })

    // Verify refresh was called with correct params
    expect(mockRefreshApigeeAccessToken).toHaveBeenCalledWith(
      axiosInstance,
      mockOptions.apigeeCis2TokenEndpoint, // Use the one from options
      "expiring-refresh-token",
      mockOptions.apigeeApiKey,
      "test-api-secret", // API secret from env var
      mockLogger
    )

    // Verify token was updated in DB
    expect(mockUpdateTokenMapping).toHaveBeenCalledWith(
      documentClient,
      mockOptions.tokenMappingTableName,
      {
        "apigeeAccessToken": "refreshed-token",
        "apigeeExpiresIn": 3600,
        "apigeeRefreshToken": "refreshed-refresh-token",
        "username": "test-user",
        "lastActivityTime": lastActivityTime
      },
      mockLogger
    )
  })

  it("should acquire new token when no token exists for non mocked user", async () => {
    // Set up mock implementations for this test

    mockExchangeTokenForApigeeAccessToken.mockReturnValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 3600
    })

    const token = {
      username: "test-user",
      cis2IdToken: "existing-cis2-token",
      cis2AccessToken: "existing-cis2-access-token",
      currentlySelectedRole: {
        role_id: "test-role-id",
        org_code: "existing_org"
      },
      lastActivityTime: Date.now()
    }

    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve(token))
    // Make sure the getSecret mock is properly setup
    mockGetSecret.mockReturnValue("test-private-key")

    const result = await authenticateRequest(
      "test-user",
      dependencies,
      token,
      mockOptions.tokenMappingTableName,
      false
    )

    expect(result).toEqual({
      apigeeAccessToken: "new-access-token",
      roleId: "test-role-id",
      orgCode: "existing_org",
      username: "test-user"
    })

    // Verify new token acquisition flow
    expect(mockVerifyIdToken).toHaveBeenCalled()
    expect(mockConstructSignedJWTBody).toHaveBeenCalled()
    expect(mockExchangeTokenForApigeeAccessToken).toHaveBeenCalled()
    expect(mockUpdateTokenMapping).toHaveBeenCalled()
    expect(mockGetSecret).toHaveBeenCalledWith("test-key-arn")
  })

  it("should acquire new token when no token exists for mocked user", async () => {
    // Set up mock implementations for this test

    mockExchangeTokenForApigeeAccessToken.mockReturnValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 3600
    })

    const token = {
      username: "Mock_test-user",
      cis2IdToken: "existing-cis2-token",
      cis2AccessToken: "existing-cis2-access-token",
      currentlySelectedRole: {
        role_id: "test-role-id",
        org_code: "existing_org"
      },
      lastActivityTime: Date.now()
    }
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve(token))

    const result = await authenticateRequest(
      "Mock_test-user",
      dependencies,
      token,
      mockOptions.tokenMappingTableName,
      false
    )

    expect(result).toEqual({
      apigeeAccessToken: "new-access-token",
      roleId: "test-role-id",
      orgCode: "existing_org",
      username: "Mock_test-user"
    })

    // Verify new token acquisition flow
    expect(mockVerifyIdToken).not.toHaveBeenCalled()
    expect(mockConstructSignedJWTBody).not.toHaveBeenCalled()
    expect(mockExchangeTokenForApigeeAccessToken).toHaveBeenCalled()
    expect(mockUpdateTokenMapping).toHaveBeenCalled()
    expect(mockGetSecret).not.toHaveBeenCalled()
  })

  it("should acquire new token when no token exists for mocked user", async () => {
    // Set up mock implementations for this test
    const token = {
      username: "Mock_user",
      apigeeCode: "apigee-code",
      currentlySelectedRole: {
        role_id: "test-role-id",
        org_code: "existing_org"
      },
      lastActivityTime: Date.now()
    }
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve(token))
    mockExchangeTokenForApigeeAccessToken.mockReturnValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 3600
    })

    // Make sure the getSecret mock is properly setup
    mockGetSecret.mockReturnValue("test-private-key")

    const result = await authenticateRequest(
      "Mock_user",
      dependencies,
      token,
      mockOptions.tokenMappingTableName,
      false
    )

    expect(result).toEqual({
      apigeeAccessToken: "new-access-token",
      roleId: "test-role-id",
      orgCode: "existing_org",
      username: "Mock_user"
    })

    // Verify new token acquisition flow
    expect(mockConstructSignedJWTBody).not.toHaveBeenCalled()
    expect(mockExchangeTokenForApigeeAccessToken).toHaveBeenCalled()
    expect(mockUpdateTokenMapping).toHaveBeenCalled()
    expect(mockGetSecret).not.toHaveBeenCalled()
  })

  it("should handle token refresh failure gracefully", async () => {
    // Set up mock implementations for this test
    const token = {
      username: "test-user",
      apigeeAccessToken: "expiring-token",
      cis2IdToken: "expiring-cis2-token",
      cis2AccessToken: "expiring-cis2-access-token",
      currentlySelectedRole: {
        role_id: "test-role-id",
        org_code: "existing_org"
      },
      apigeeRefreshToken: "expiring-refresh-token",
      apigeeExpiresIn: Math.floor(Date.now() / 1000) + 30, // expires in 30 seconds
      lastActivityTime: Date.now()
    }
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve(token))

    // IMPORTANT FIX: Properly mock rejection instead of returning an Error object
    mockRefreshApigeeAccessToken.mockRejectedValue(new Error("Refresh failed") as never)

    // Mock successful token exchange as the fallback after refresh failure
    mockExchangeTokenForApigeeAccessToken.mockReturnValue({
      accessToken: "fallback-access-token",
      refreshToken: "fallback-refresh-token",
      expiresIn: 3600
    })

    const result = await authenticateRequest(
      "test-user",
      dependencies,
      token,
      mockOptions.tokenMappingTableName,
      false
    )

    // Should fall back to new token acquisition
    expect(result).toEqual({
      apigeeAccessToken: "fallback-access-token",
      roleId: "test-role-id",
      orgCode: "existing_org",
      username: "test-user"
    })

    // Verify both refresh and fallback were attempted
    expect(mockRefreshApigeeAccessToken).toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Token refresh failed"),
      expect.anything()
    )
  })

  it("should handle missing refresh token gracefully", async () => {
    // Set up mock implementations for this test

    const token = {
      username: "test-user",
      apigeeAccessToken: "expiring-token",
      cis2IdToken: "expiring-cis2-token",
      cis2AccessToken: "expiring-cis2-access-token",
      currentlySelectedRole: {
        role_id: "test-role-id",
        org_code: "existing_org"
      },
      apigeeExpiresIn: Math.floor(Date.now() / 1000) + 30, // expires in 30 seconds
      lastActivityTime: Date.now()
    }
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve(token))

    // Mock successful token exchange as the fallback after refresh failure
    mockExchangeTokenForApigeeAccessToken.mockReturnValue({
      accessToken: "fallback-access-token",
      refreshToken: "fallback-refresh-token",
      expiresIn: 3600
    })

    const result = await authenticateRequest(
      "test-user",
      dependencies,
      token,
      mockOptions.tokenMappingTableName,
      false
    )

    // Should fall back to new token acquisition
    expect(result).toEqual({
      apigeeAccessToken: "fallback-access-token",
      roleId: "test-role-id",
      orgCode: "existing_org",
      username: "test-user"
    })

    // Verify both refresh and fallback were attempted
    expect(mockRefreshApigeeAccessToken).not.toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Token refresh failed"),
      expect.anything()
    )
  })

  it("should throw an error when missing apigee expires in", async () => {
    // Set up mock implementation for this test
    const token = {
      username: "test-user",
      apigeeAccessToken: "existing-token",
      cis2IdToken: "existing-cis2-token",
      cis2AccessToken: "existing-cis2-access-token",
      currentlySelectedRole: {
        role_id: "existing-role-id",
        org_code: "existing_org"
      },
      lastActivityTime: Date.now()
    }
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve(token))

    await expect(authenticateRequest(
      "test-user",
      dependencies,
      token,
      mockOptions.tokenMappingTableName,
      false
    )).rejects.toThrow(new Error("Missing apigee expires in time"))

    // Verify that token refresh functions were not called
    expect(mockRefreshApigeeAccessToken).not.toHaveBeenCalled()
  })

  it("should throw an error when no token exists for non mocked user", async () => {
    // Set up mock implementations for this test

    mockExchangeTokenForApigeeAccessToken.mockReturnValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 3600
    })

    const token = {
      username: "test-user",
      cis2AccessToken: "existing-cis2-access-token",
      currentlySelectedRole: {
        role_id: "test-role-id",
        org_code: "existing_org"
      },
      lastActivityTime: Date.now()
    }
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve(token))
    // Make sure the getSecret mock is properly setup
    mockGetSecret.mockReturnValue("test-private-key")

    await expect(authenticateRequest(
      "test-user",
      dependencies,
      token,
      mockOptions.tokenMappingTableName,
      false
    )).rejects.toThrow(new Error("Missing cis2IdToken"))
  })

  it("should throw an error when exchange token does not return access token", async () => {
    // Set up mock implementations for this test

    mockExchangeTokenForApigeeAccessToken.mockReturnValue({
      refreshToken: "new-refresh-token",
      expiresIn: 3600
    })

    const token = {
      username: "test-user",
      cis2IdToken: "existing-cis2-token",
      cis2AccessToken: "existing-cis2-access-token",
      currentlySelectedRole: {
        role_id: "test-role-id",
        org_code: "existing_org"
      },
      lastActivityTime: Date.now()
    }
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve(token))
    // Make sure the getSecret mock is properly setup
    mockGetSecret.mockReturnValue("test-private-key")
    await expect(authenticateRequest(
      "test-user",
      dependencies,
      token,
      mockOptions.tokenMappingTableName,
      false
    )).rejects.toThrow(new Error("Failed to obtain required tokens after authentication flow"))
  })

})
