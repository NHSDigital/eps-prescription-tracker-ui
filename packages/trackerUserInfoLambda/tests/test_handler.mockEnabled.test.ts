import {jest} from "@jest/globals"
import jwksClient from "jwks-rsa"
import {OidcConfig} from "@cpt-ui-common/authFunctions"

const TokenMappingTableName = process.env.TokenMappingTableName

const CIS2_OIDC_ISSUER = process.env.CIS2_OIDC_ISSUER
const CIS2_OIDC_CLIENT_ID = process.env.CIS2_OIDC_CLIENT_ID
//const CIS2_OIDC_HOST = process.env.CIS2_OIDC_HOST ?? ""
const CIS2_OIDCJWKS_ENDPOINT = process.env.CIS2_OIDCJWKS_ENDPOINT
const CIS2_USER_INFO_ENDPOINT = process.env.CIS2_USER_INFO_ENDPOINT
const CIS2_USER_POOL_IDP = process.env.CIS2_USER_POOL_IDP
//const CIS2_IDP_TOKEN_PATH = process.env.CIS2_IDP_TOKEN_PATH ?? ""

const MOCK_OIDC_ISSUER = process.env.MOCK_OIDC_ISSUER
const MOCK_OIDC_CLIENT_ID = process.env.MOCK_OIDC_CLIENT_ID
//const MOCK_OIDC_HOST = process.env.MOCK_OIDC_HOST ?? ""
const MOCK_OIDCJWKS_ENDPOINT = process.env.MOCK_OIDCJWKS_ENDPOINT
const MOCK_USER_INFO_ENDPOINT = process.env.MOCK_USER_INFO_ENDPOINT
const MOCK_USER_POOL_IDP = process.env.MOCK_USER_POOL_IDP
//const MOCK_IDP_TOKEN_PATH = process.env.MOCK_IDP_TOKEN_PATH

process.env.MOCK_MODE_ENABLED = "true"

// Mocked functions from cis2TokenHelpers
const mockFetchAndVerifyCIS2Tokens = jest.fn()
const mockGetUsernameFromEvent = jest.fn()
const mockInitializeOidcConfig = jest.fn()

jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  const fetchAndVerifyCIS2Tokens = mockFetchAndVerifyCIS2Tokens.mockImplementation(async () => {
    return {
      cis2IdToken: "idToken",
      cis2AccessToken: "accessToken"
    }
  })

  const getUsernameFromEvent = mockGetUsernameFromEvent.mockImplementation(() => {
    return "Mock_JoeBloggs"
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
    initializeOidcConfig
  }
})

// Mocked functions from userInfoHelpers
const mockFetchUserInfo = jest.fn()
const mockUpdateDynamoTable = jest.fn()

jest.unstable_mockModule("@/userInfoHelpers", () => {
  const fetchUserInfo = mockFetchUserInfo.mockImplementation(() => {
    return {
      roles_with_access: [],
      roles_without_access: [],
      selected_role: {}
    }
  })

  const updateDynamoTable = mockUpdateDynamoTable.mockImplementation(() => {})

  return {
    fetchUserInfo,
    updateDynamoTable
  }
})

const {handler} = await import("@/handler")
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"
import {Logger} from "@aws-lambda-powertools/logger"

describe("Lambda Handler Tests with mock enabled", () => {
  let event = {...mockAPIGatewayProxyEvent}
  let context = {...mockContext}

  beforeEach(() => {
    mockFetchUserInfo.mockImplementation(() => {
      return {
        roles_with_access: [],
        roles_without_access: [],
        selected_role: {}
      }
    })
    mockUpdateDynamoTable.mockImplementation(() => {})
    mockFetchAndVerifyCIS2Tokens.mockImplementation(async () => {
      return {
        cis2IdToken: "idToken",
        cis2AccessToken: "accessToken"
      }
    })
    mockGetUsernameFromEvent.mockImplementation(() => {
      return "Mock_JoeBloggs"
    })
  })

  it("should return a successful response when called normally", async () => {
    const response = await handler(event, context)

    expect(mockFetchAndVerifyCIS2Tokens).toHaveBeenCalled()
    expect(mockFetchUserInfo).toHaveBeenCalled()
    expect(mockUpdateDynamoTable).toHaveBeenCalled()

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 200)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "UserInfo fetched successfully")
    expect(body).toHaveProperty("userInfo")
  })

  it("should use cis2 values when username does not start with Mock_",
    async () => {
      mockGetUsernameFromEvent.mockReturnValue("Primary_JohnDoe")
      await handler(event, context)
      expect(mockGetUsernameFromEvent).toHaveBeenCalled()
      expect(mockFetchAndVerifyCIS2Tokens).toHaveBeenCalledWith(
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
        expect.any(Object),
        undefined,
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

  it("should use mock values when username starts with Mock_",
    async () => {
      mockGetUsernameFromEvent.mockReturnValue("Mock_JaneDoe")

      await handler(event, context)
      expect(mockFetchAndVerifyCIS2Tokens).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          oidcIssuer: MOCK_OIDC_ISSUER,
          oidcClientID: MOCK_OIDC_CLIENT_ID,
          oidcJwksEndpoint: MOCK_OIDCJWKS_ENDPOINT,
          oidcUserInfoEndpoint: MOCK_USER_INFO_ENDPOINT,
          userPoolIdp: MOCK_USER_POOL_IDP,
          tokenMappingTableName: TokenMappingTableName
        })
      )

      expect(mockFetchUserInfo).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        undefined,
        expect.any(Object),
        expect.objectContaining({
          oidcIssuer: MOCK_OIDC_ISSUER,
          oidcClientID: MOCK_OIDC_CLIENT_ID,
          oidcJwksEndpoint: MOCK_OIDCJWKS_ENDPOINT,
          oidcUserInfoEndpoint: MOCK_USER_INFO_ENDPOINT,
          userPoolIdp: MOCK_USER_POOL_IDP,
          tokenMappingTableName: TokenMappingTableName
        })
      )
    })

  it("should return 500 and log error when fetchAndVerifyCIS2Tokens throws an error", async () => {
    const error = new Error("Token verification failed")
    const loggerSpy = jest.spyOn(Logger.prototype, "error")
    mockFetchAndVerifyCIS2Tokens.mockImplementation(async () => Promise.reject(error))

    const response = await handler(event, context)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "Error: Token verification failed"
    )
    expect(mockFetchUserInfo).not.toHaveBeenCalled()
    expect(mockUpdateDynamoTable).not.toHaveBeenCalled()
  })

  it("should return 500 and log error when fetchUserInfo throws an error", async () => {
    const error = new Error("User info fetch failed")
    const loggerSpy = jest.spyOn(Logger.prototype, "error")
    mockFetchUserInfo.mockImplementation(async () => Promise.reject(error))

    const response = await handler(event, context)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "Error: User info fetch failed"
    )
    expect(mockUpdateDynamoTable).not.toHaveBeenCalled()
  })

  it("should return 500 and log error when updateDynamoTable throws an error", async () => {
    const error = new Error("Dynamo update failed")
    const loggerSpy = jest.spyOn(Logger.prototype, "error")
    mockUpdateDynamoTable.mockImplementation(() => {
      throw error
    })

    const response = await handler(event, context)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "Error: Dynamo update failed"
    )
  })

  it("should handle unexpected error types gracefully", async () => {
    mockUpdateDynamoTable.mockImplementation(() => {
      throw new Error("Unexpected error string")
    })
    const loggerSpy = jest.spyOn(Logger.prototype, "error")

    const response = await handler(event, context)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "Error: Unexpected error string"
    )
  })

  it("should call updateDynamoTable with the correct parameters", async () => {
    const testUsername = "Primary_Tester"
    mockGetUsernameFromEvent.mockReturnValue(testUsername)
    const userInfoMock = {
      roles_with_access: ["roleX"],
      roles_without_access: ["roleY"],
      currently_selected_role: ["roleX"]
    }
    mockFetchUserInfo.mockReturnValue(userInfoMock)

    mockUpdateDynamoTable.mockImplementation(() => {
      return true
    })

    mockFetchAndVerifyCIS2Tokens.mockImplementation(async () => {
      return {
        cis2IdToken: "idToken",
        cis2AccessToken: "accessToken"
      }
    })

    await handler(event, context)
    expect(mockUpdateDynamoTable).toHaveBeenCalledWith(
      testUsername,
      userInfoMock,
      expect.any(Object),
      expect.any(Object),
      "dummyTable"
    )
  })
})
