import {jest} from "@jest/globals"
import jwksClient from "jwks-rsa"
import {OidcConfig} from "@cpt-ui-common/authFunctions"
import {Logger} from "@aws-lambda-powertools/logger"

const mockGetTokenMapping = jest.fn()
const mockUpdateTokenMapping = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    getTokenMapping: mockGetTokenMapping,
    updateTokenMapping: mockUpdateTokenMapping
  }
})

// Mocked functions from authFunctions
const mockGetUsernameFromEvent = jest.fn()
const mockInitializeOidcConfig = jest.fn()
const mockAuthenticateRequest = jest.fn()

jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  const fetchAndVerifyCIS2Tokens = mockAuthenticateRequest.mockImplementation(async () => {
    return {
      cis2IdToken: "idToken",
      cis2AccessToken: "accessToken"
    }
  })

  const getUsernameFromEvent = mockGetUsernameFromEvent.mockImplementation(() => {
    return "Primary_JoeBloggs"
  })

  const authenticateRequest = mockAuthenticateRequest.mockImplementation(async (event) => {
    const username = mockGetUsernameFromEvent(event) as string

    return {
      username,
      cis2AccessToken: "foo",
      cis2IdToken: "mock-id-token",
      roleId: "test-role",
      isMockRequest: false
    }
  })

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
      tokenMappingTableName: process.env["TokenMappingTableName"] ?? "",
      oidcTokenEndpoint: "https://dummyauth.com/token"
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
      oidcTokenEndpoint: "https://dummyauth.com/token"
    }

    return {cis2OidcConfig, mockOidcConfig}
  })

  return {
    fetchAndVerifyCIS2Tokens,
    getUsernameFromEvent,
    initializeOidcConfig,
    authenticateRequest
  }
})

// Mocked functions from userInfoHelpers
const mockFetchUserInfo = jest.fn()

jest.unstable_mockModule("@/userInfoHelpers", () => {
  const fetchUserInfo = mockFetchUserInfo.mockImplementation(() => {
    return {
      roles_with_access: [],
      roles_without_access: [],
      selected_role: {}
    }
  })
  return {
    fetchUserInfo
  }
})

const {handler} = await import("@/handler")
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"

describe("Lambda Handler Tests with mock disabled", () => {
  let event = {...mockAPIGatewayProxyEvent}
  let context = {...mockContext}

  it("should return a successful response when called normally", async () => {
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve( {
      username: "testUser",
      apigeeAccessToken: "valid-token",
      apigeeIdToken: "id-token",
      apigeeRefreshToken: "refresh-token",
      selectedRoleId: "role-id"
    }))
    const response = await handler(event, context)

    expect(mockAuthenticateRequest).toHaveBeenCalled()
    expect(mockFetchUserInfo).toHaveBeenCalled()
    expect(mockUpdateTokenMapping).toHaveBeenCalled()

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 200)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "UserInfo fetched successfully from the OIDC endpoint")
    expect(body).toHaveProperty("userInfo")
  })

  it("should return error when authenticateRequest throws an error", async () => {
    const error = new Error("Token verification failed")
    const loggerSpy = jest.spyOn(Logger.prototype, "error")
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve( {
      username: "testUser",
      apigeeAccessToken: "valid-token",
      apigeeIdToken: "id-token",
      apigeeRefreshToken: "refresh-token",
      selectedRoleId: "role-id"
    }))

    // Important: Use implementation, not return value
    mockAuthenticateRequest.mockImplementationOnce(() => {
      throw error
    })

    const response = await handler(event, context)

    // Check response format matches what the middleware produces
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "Error: Token verification failed"
    )
    expect(mockFetchUserInfo).not.toHaveBeenCalled()
    expect(mockUpdateTokenMapping).not.toHaveBeenCalled()
  })

  it("should return error when fetchUserInfo throws an error", async () => {
    const error = new Error("User info fetch failed")
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve( {
      username: "testUser",
      apigeeAccessToken: "valid-token",
      apigeeIdToken: "id-token",
      apigeeRefreshToken: "refresh-token",
      selectedRoleId: "role-id"
    }))
    const loggerSpy = jest.spyOn(Logger.prototype, "error")

    // Use implementation to throw an error synchronously
    mockFetchUserInfo.mockImplementationOnce(() => {
      throw error
    })

    const response = await handler(event, context)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "Error: User info fetch failed"
    )
    expect(mockUpdateTokenMapping).not.toHaveBeenCalled()
  })

  it("should return error when updateDynamoTable throws an error", async () => {
    const error = new Error("Dynamo update failed")
    const loggerSpy = jest.spyOn(Logger.prototype, "error")

    // Use implementation to throw an error synchronously
    mockUpdateTokenMapping.mockImplementationOnce(() => {
      throw error
    })
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve( {
      username: "testUser",
      apigeeAccessToken: "valid-token",
      apigeeIdToken: "id-token",
      apigeeRefreshToken: "refresh-token",
      selectedRoleId: "role-id"
    }))

    const response = await handler(event, context)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "Error: Dynamo update failed"
    )
  })

  it("should return user info if roles_with_access is not empty", async () => {
    const testUsername = "Mock_JaneDoe"
    mockGetUsernameFromEvent.mockReturnValue(testUsername)
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve( {
      username: "testUser",
      apigeeAccessToken: "valid-token",
      apigeeIdToken: "id-token",
      apigeeRefreshToken: "refresh-token",
      selectedRoleId: "role-id",
      rolesWithAccess: [
        {role_name: "Doctor", role_id: "123", org_code: "ABC", org_name: "Test Hospital"}
      ],
      rolesWithoutAccess: [],
      currentlySelectedRole: {
        role_name: "Doctor",
        role_id: "123",
        org_code: "ABC",
        org_name: "Test Hospital"
      },
      userDetails: {family_name: "Doe", given_name: "John"}
    }))

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("UserInfo fetched successfully from DynamoDB")

    const responseBody = JSON.parse(response.body)
    expect(responseBody.userInfo).toEqual({
      "currently_selected_role":       {
        "org_code": "ABC", "org_name": "Test Hospital", "role_id": "123", "role_name": "Doctor"
      },
      "roles_with_access": [{"org_code": "ABC", "org_name": "Test Hospital", "role_id": "123", "role_name": "Doctor"}],
      "roles_without_access": [],
      "user_details": {"family_name": "Doe", "given_name": "John"}}
    )
  })

  it("should return user info if roles_without_access is not empty", async () => {
    const testUsername = "Mock_JaneDoe"
    mockGetUsernameFromEvent.mockReturnValue(testUsername)
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve( {
      username: "testUser",
      apigeeAccessToken: "valid-token",
      apigeeIdToken: "id-token",
      apigeeRefreshToken: "refresh-token",
      selectedRoleId: "role-id",
      rolesWithAccess: [
        {role_name: "Doctor", role_id: "123", org_code: "ABC", org_name: "Test Hospital"}
      ],
      rolesWithoutAccess: [
        {role_name: "Receptionist", role_id: "456", org_code: "DEF", org_name: "Test Hospital"}
      ],
      currentlySelectedRole: {
        role_name: "Doctor",
        role_id: "123",
        org_code: "ABC",
        org_name: "Test Hospital"
      },
      userDetails: {family_name: "Doe", given_name: "John"}
    }))

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("UserInfo fetched successfully from DynamoDB")

    const responseBody = JSON.parse(response.body)
    expect(responseBody.userInfo).toEqual({
      "currently_selected_role":       {
        "org_code": "ABC", "org_name": "Test Hospital", "role_id": "123", "role_name": "Doctor"
      },
      "roles_with_access": [{"org_code": "ABC", "org_name": "Test Hospital", "role_id": "123", "role_name": "Doctor"}],
      "roles_without_access": [
        {role_name: "Receptionist", role_id: "456", org_code: "DEF", org_name: "Test Hospital"}
      ],
      "user_details": {"family_name": "Doe", "given_name": "John"}}
    )
  })

  it("should return cached user info even if currently_selected_role is undefined", async () => {
    const testUsername = "Mock_JaneDoe"
    mockGetUsernameFromEvent.mockReturnValue(testUsername)
    mockGetTokenMapping.mockImplementationOnce(() => Promise.resolve( {
      username: "testUser",
      apigeeAccessToken: "valid-token",
      apigeeIdToken: "id-token",
      apigeeRefreshToken: "refresh-token",
      selectedRoleId: "role-id",
      rolesWithAccess: [
        {role_name: "Doctor", role_id: "123", org_code: "ABC", org_name: "Test Hospital"}
      ],
      rolesWithoutAccess: [
        {role_name: "Receptionist", role_id: "456", org_code: "DEF", org_name: "Test Hospital"}
      ],
      currentlySelectedRole: {},
      userDetails: {family_name: "Doe", given_name: "John"}
    }))

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("UserInfo fetched successfully from DynamoDB")

    const responseBody = JSON.parse(response.body)
    expect(responseBody.userInfo).toEqual({
      "currently_selected_role":  {},
      "roles_with_access": [{"org_code": "ABC", "org_name": "Test Hospital", "role_id": "123", "role_name": "Doctor"}],
      "roles_without_access": [
        {role_name: "Receptionist", role_id: "456", org_code: "DEF", org_name: "Test Hospital"}
      ],
      "user_details": {"family_name": "Doe", "given_name": "John"}}
    )
  })

})
