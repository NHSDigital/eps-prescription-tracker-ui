import {jest} from "@jest/globals"
import {Logger} from "@aws-lambda-powertools/logger"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
// import * as parameterSecrets from "@aws-lambda-powertools/parameters/secrets"

// Mock the jwt module
jest.mock("jsonwebtoken", () => ({
  decode: jest.fn().mockReturnValue({
    header: {kid: "test-kid"},
    payload: {
      sub: "test-subject",
      exp: Math.floor(Date.now() / 1000) + 3600,
      acr: "AAL3_ANY"
    }
  }),
  verify: jest.fn().mockReturnValue({
    sub: "test-subject",
    exp: Math.floor(Date.now() / 1000) + 3600,
    acr: "AAL3_ANY"
  }),
  sign: jest.fn().mockReturnValue("signed-jwt-token")
}))

const mockGetSecret = jest.fn().mockReturnValue("test-private-key")

jest.unstable_mockModule("@aws-lambda-powertools/parameters/secrets", () => ({
  getSecret: mockGetSecret
}))

// Create mocks for the functions from the index module
const mockGetUsernameFromEvent = jest.fn()
const mockGetExistingApigeeAccessToken = jest.fn()
const mockRefreshApigeeAccessToken = jest.fn()
const mockExchangeTokenForApigeeAccessToken = jest.fn()
const mockFetchAndVerifyCIS2Tokens = jest.fn()
const mockConstructSignedJWTBody = jest.fn()
const mockDecodeToken = jest.fn()
const mockVerifyIdToken = jest.fn()
const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)
// Mock the axios module
jest.mock("axios", () => ({
  create: jest.fn().mockReturnValue({
    post: jest.fn().mockReturnValue({data: {}}),
    get: jest.fn().mockReturnValue({data: {}})
  })
}))

const mockUpdateTokenMapping = jest.fn()
const mockGetTokenMapping = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {

  return {
    updateTokenMapping: mockUpdateTokenMapping,
    getTokenMapping: mockGetTokenMapping
  }
})

// Mock the index module
jest.unstable_mockModule("../src/index", () => ({
  getUsernameFromEvent: mockGetUsernameFromEvent,
  refreshApigeeAccessToken: mockRefreshApigeeAccessToken,
  exchangeTokenForApigeeAccessToken: mockExchangeTokenForApigeeAccessToken,
  fetchAndVerifyCIS2Tokens: mockFetchAndVerifyCIS2Tokens,
  constructSignedJWTBody: mockConstructSignedJWTBody,
  decodeToken: mockDecodeToken,
  verifyIdToken: mockVerifyIdToken
}))

const authModule = await import("../src/authenticateRequest")
const {authenticateRequest} = authModule

describe("authenticateRequest", () => {
  // Common test setup

  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  } as unknown as Logger

  const mockOptions = {
    tokenMappingTableName: "test-table",
    jwtPrivateKeyArn: "test-key-arn",
    apigeeApiKey: "test-api-key",
    jwtKid: "test-kid",
    defaultRoleId: "test-role-id",
    apigeeApiSecret: "test-api-secret",
    apigeeMockTokenEndpoint: "mock-token-endpoint",
    apigeeCis2TokenEndpoint: "cis2-token-endpoint"
  }

  beforeEach(() => {
    // Clear all mock implementations
    jest.clearAllMocks()

    // Set up default mocks for all tests
    mockGetUsernameFromEvent.mockReturnValue("test-user")

    // Default mock for fetchAndVerifyCIS2Tokens
    mockFetchAndVerifyCIS2Tokens.mockReturnValue({
      cis2AccessToken: "mock-cis2-access",
      cis2IdToken: "mock-cis2-id"
    })

    // Default mock for constructSignedJWTBody
    mockConstructSignedJWTBody.mockReturnValue({param: "value"})

    // Ensure process.env is populated
    process.env.APIGEE_API_SECRET = "test-api-secret"
  })

  it("should use existing valid token when available", async () => {
    // Set up mock implementation for this test

    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve( {
      username: "test-user",
      apigeeAccessToken: "existing-token",
      cis2IdToken: "existing-cis2-token",
      cis2AccessToken: "existing-cis2-access-token",
      selectedRoleId: "existing-role-id",
      apigeeExpiresIn: Math.floor(Date.now() / 1000) + 1000
    }))

    const result = await authenticateRequest(
      "test-user",
      documentClient,
      mockLogger,
      mockOptions
    )

    expect(result).toEqual({
      apigeeAccessToken: "existing-token",
      cis2IdToken: "existing-cis2-token",
      cis2AccessToken: "existing-cis2-access-token",
      roleId: "existing-role-id",
      isMockRequest: false
    })

    // Verify that token refresh functions were not called
    expect(mockRefreshApigeeAccessToken).not.toHaveBeenCalled()
    expect(mockFetchAndVerifyCIS2Tokens).not.toHaveBeenCalled()
  })

  it("should refresh token when it's about to expire", async () => {
    // Set up mock implementations for this test
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve( {
      username: "test-user",
      apigeeAccessToken: "expiring-token",
      cis2IdToken: "expiring-cis2-token",
      cis2AccessToken: "expiring-cis2-access-token",
      selectedRoleId: "expiring-role-id",
      apigeeRefreshToken: "expiring-refresh-token",
      apigeeExpiresIn: Math.floor(Date.now() / 1000) + 30 // expires in 30 seconds
    }))

    mockRefreshApigeeAccessToken.mockReturnValue({
      accessToken: "refreshed-token",
      idToken: "refreshed-cis2-token",
      refreshToken: "refreshed-refresh-token",
      expiresIn: 3600,
      roleId: "expiring-role-id" // Need to include the role ID here
    })

    const result = await authenticateRequest(
      "test-user",
      documentClient,
      mockLogger,
      mockOptions
    )

    expect(result).toEqual({
      apigeeAccessToken: "refreshed-token",
      cis2IdToken: "refreshed-cis2-token",
      roleId: "expiring-role-id",
      isMockRequest: false
    })

    // Verify refresh was called with correct params
    expect(mockRefreshApigeeAccessToken).toHaveBeenCalledWith(
      expect.anything(), // axios instance
      mockOptions.apigeeCis2TokenEndpoint, // Use the one from options
      "expiring-refresh-token",
      mockOptions.apigeeApiKey,
      "test-api-secret", // API secret from env var
      expect.anything() // logger
    )

    // Verify token was updated in DB
    expect(mockUpdateTokenMapping).toHaveBeenCalledWith(
      documentClient,
      mockOptions.tokenMappingTableName,
      {
        "apigeeAccessToken": "refreshed-token",
        "apigeeExpiresIn": 3600,
        "apigeeRefreshToken": "refreshed-refresh-token",
        "username": "test-user"
      },
      expect.anything() // logger
    )
  })

  // TODO: this test needs fixing currently not currently mocks
  it("should acquire new token when no token exists", async () => {
    // Set up mock implementations for this test
    mockGetExistingApigeeAccessToken.mockReturnValue(null)

    mockExchangeTokenForApigeeAccessToken.mockReturnValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 3600
    })

    // Make sure the getSecret mock is properly setup
    mockGetSecret.mockReturnValue("test-private-key")

    const result = await authenticateRequest(
      "test-user",
      documentClient,
      mockLogger,
      mockOptions
    )

    expect(result).toEqual({
      apigeeAccessToken: "new-access-token",
      cis2IdToken: "mock-cis2-id",
      roleId: "test-role-id",
      isMockRequest: false
    })

    // Verify new token acquisition flow
    expect(mockFetchAndVerifyCIS2Tokens).toHaveBeenCalled()
    expect(mockConstructSignedJWTBody).toHaveBeenCalled()
    expect(mockExchangeTokenForApigeeAccessToken).toHaveBeenCalled()
    expect(mockUpdateTokenMapping).toHaveBeenCalled()
    expect(mockGetSecret).toHaveBeenCalledWith("test-key-arn")
  })

  it("should handle mock mode without apigee access token edge case correctly", async () => {
    // Enable mock mode
    const mockOptionsWithMock = {
      ...mockOptions,
      mockModeEnabled: true
    }

    // Set up mock implementations for this test
    mockGetUsernameFromEvent.mockReturnValue("Mock_user")
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve( {
      username: "Mock_user",
      apigeeAccessToken: undefined
    }))
    // We expect the function to throw an error in mock mode with no token
    await expect(authenticateRequest(
      "Mock_user",
      documentClient,
      mockLogger,
      mockOptionsWithMock
    )).rejects.toThrow("Unexpected state for mock request")

    // Verify warning was logged about unexpected state
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Mock user but no valid token exists or refresh failed."
    )

    // No token-related functions should be called
    expect(mockFetchAndVerifyCIS2Tokens).not.toHaveBeenCalled()
    expect(mockConstructSignedJWTBody).not.toHaveBeenCalled()
    expect(mockExchangeTokenForApigeeAccessToken).not.toHaveBeenCalled()
  })

  // TODO: this test needs fixing currently not currently mocks
  it("should handle token refresh failure gracefully", async () => {
    // Set up mock implementations for this test

    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve( {
      username: "test-user",
      apigeeAccessToken: "expiring-token",
      cis2IdToken: "expiring-cis2-token",
      cis2AccessToken: "expiring-cis2-access-token",
      selectedRoleId: "expiring-role-id",
      apigeeRefreshToken: "expiring-refresh-token",
      apigeeExpiresIn: Math.floor(Date.now() / 1000) + 30 // expires in 30 seconds
    }))

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
      documentClient,
      mockLogger,
      mockOptions
    )

    // Should fall back to new token acquisition
    expect(result).toEqual({
      apigeeAccessToken: "fallback-access-token",
      cis2IdToken: "mock-cis2-id",
      roleId: "test-role-id", // This comes from options.defaultRoleId
      isMockRequest: false
    })

    // Verify both refresh and fallback were attempted
    expect(mockRefreshApigeeAccessToken).toHaveBeenCalled()
    expect(mockFetchAndVerifyCIS2Tokens).toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Token refresh failed"),
      expect.anything()
    )
  })
})
