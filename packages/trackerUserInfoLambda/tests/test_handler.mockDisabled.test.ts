import {jest} from "@jest/globals"
import jwksClient from "jwks-rsa"
import {OidcConfig} from "@cpt-ui-common/authFunctions"

const TokenMappingTableName = process.env.TokenMappingTableName

const CIS2_OIDC_ISSUER = process.env.CIS2_OIDC_ISSUER
const CIS2_OIDC_CLIENT_ID = process.env.CIS2_OIDC_CLIENT_ID
const CIS2_OIDCJWKS_ENDPOINT = process.env.CIS2_OIDCJWKS_ENDPOINT
const CIS2_USER_INFO_ENDPOINT = process.env.CIS2_USER_INFO_ENDPOINT
const CIS2_USER_POOL_IDP = process.env.CIS2_USER_POOL_IDP

process.env.MOCK_MODE_ENABLED = "false"

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

    // Throw error if mock user in non-mock mode
    if (username.startsWith("Mock_")) {
      throw new Error("Trying to use a mock user when mock mode is disabled")
    }

    return {
      username,
      apigeeAccessToken: "foo",
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
const mockUpdateDynamoTable = jest.fn()
const mockFetchDynamoTable = jest.fn()

jest.unstable_mockModule("@/userInfoHelpers", () => {
  const fetchUserInfo = mockFetchUserInfo.mockImplementation(() => {
    return {
      roles_with_access: [],
      roles_without_access: [],
      selected_role: {}
    }
  })

  const updateDynamoTable = mockUpdateDynamoTable.mockImplementation(() => {})

  const fetchDynamoTable = mockFetchDynamoTable.mockImplementation(() => {})

  return {
    fetchUserInfo,
    updateDynamoTable,
    fetchDynamoTable
  }
})

const {handler} = await import("@/handler")
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"
import {Logger} from "@aws-lambda-powertools/logger"

describe.skip("Lambda Handler Tests with mock disabled", () => {
  let event = {...mockAPIGatewayProxyEvent}
  let context = {...mockContext}

  it("should return a successful response when called normally", async () => {
    const response = await handler(event, context)

    expect(mockAuthenticateRequest).toHaveBeenCalled()
    expect(mockFetchUserInfo).toHaveBeenCalled()
    expect(mockUpdateDynamoTable).toHaveBeenCalled()

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 200)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "UserInfo fetched successfully from the OIDC endpoint")
    expect(body).toHaveProperty("userInfo")
  })

  it.skip("should use cis2 values when username does not start with Mock_",
    async () => {
      mockGetUsernameFromEvent.mockReturnValue("Primary_JohnDoe")
      await handler(event, context)
      expect(mockGetUsernameFromEvent).toHaveBeenCalled()
      expect(mockAuthenticateRequest).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          oidcIssuer: CIS2_OIDC_ISSUER,
          oidcClientID: CIS2_OIDC_CLIENT_ID,
          oidcJwksEndpoint: CIS2_OIDCJWKS_ENDPOINT,
          oidcUserInfoEndpoint: CIS2_USER_INFO_ENDPOINT,
          userPoolIdp: CIS2_USER_POOL_IDP,
          tokenMappingTableName: TokenMappingTableName
        })
      )

      expect(mockFetchUserInfo).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          oidcIssuer: CIS2_OIDC_ISSUER,
          oidcClientID: CIS2_OIDC_CLIENT_ID,
          oidcJwksEndpoint: CIS2_OIDCJWKS_ENDPOINT,
          oidcUserInfoEndpoint: CIS2_USER_INFO_ENDPOINT,
          userPoolIdp: CIS2_USER_POOL_IDP,
          tokenMappingTableName: TokenMappingTableName
        })
      )
    })

  it("should throw an error when username starts with Mock_",
    async () => {
      mockGetUsernameFromEvent.mockReturnValue("Mock_JaneDoe")
      const loggerSpy = jest.spyOn(Logger.prototype, "error")

      const response = await handler(event, context)
      expect(response).toMatchObject({
        message: "A system error has occurred"
      })
      expect(mockFetchUserInfo).not.toHaveBeenCalled()
      expect(mockUpdateDynamoTable).not.toHaveBeenCalled()
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.any(Object),
        "Error: Trying to use a mock user when mock mode is disabled"
      )
    })
})
