import {jest} from "@jest/globals"

// Mocked functions from cis2TokenHelpers
const mockFetchAndVerifyCIS2Tokens = jest.fn()
const mockGetUsernameFromEvent = jest.fn()

jest.unstable_mockModule("@/cis2TokenHelpers", () => {
  const fetchAndVerifyCIS2Tokens = mockFetchAndVerifyCIS2Tokens.mockImplementation(async () => {
    return {
      cis2IdToken: "idToken",
      cis2AccessToken: "accessToken"
    }
  })

  const getUsernameFromEvent = mockGetUsernameFromEvent.mockImplementation(() => {
    return "Mock_JoeBloggs"
  })

  return {
    fetchAndVerifyCIS2Tokens,
    getUsernameFromEvent
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

describe("Lambda Handler Tests", () => {
  let event = {...mockAPIGatewayProxyEvent}
  let context = {...mockContext}

  beforeEach(() => {
    // Set default environment variables
    process.env.MOCK_MODE_ENABLED = "false"

    process.env.REAL_IDP_TOKEN_PATH = "/real/idp/token"
    process.env.REAL_USER_INFO_ENDPOINT = "https://real-userinfo.com"
    process.env.REAL_OIDCJWKS_ENDPOINT = "https://real-jwks.com"
    process.env.REAL_JWT_PRIVATE_KEY_ARN = "arn:aws:ssm:region:account-id:parameter/real-key"
    process.env.REAL_USER_POOL_IDP = "RealPoolIdentityProvider"
    process.env.REAL_USE_SIGNED_JWT = "true"
    process.env.REAL_OIDC_CLIENT_ID = "real-client-id"
    process.env.REAL_OIDC_ISSUER = "https://real-oidc-issuer.com"

    process.env.MOCK_IDP_TOKEN_PATH = "/mock/idp/token"
    process.env.MOCK_USER_INFO_ENDPOINT = "https://mock-userinfo.com"
    process.env.MOCK_OIDCJWKS_ENDPOINT = "https://mock-jwks.com"
    process.env.MOCK_JWT_PRIVATE_KEY_ARN = "arn:aws:ssm:region:account-id:parameter/mock-key"
    process.env.MOCK_USER_POOL_IDP = "MockPoolIdentityProvider"
    process.env.MOCK_USE_SIGNED_JWT = "true"
    process.env.MOCK_OIDC_CLIENT_ID = "mock-client-id"
    process.env.MOCK_OIDC_ISSUER = "https://mock-oidc-issuer.com"
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

  it(
    "should use real environment variables when MOCK_MODE_ENABLED is false " +
    "and username does not start with Mock_",
    async () => {
      mockGetUsernameFromEvent.mockReturnValue("Primary_JohnDoe")
      await handler(event, context)
      expect(mockGetUsernameFromEvent).toHaveBeenCalled()
      expect(process.env.idpTokenPath).toBe(process.env.REAL_IDP_TOKEN_PATH)
      expect(process.env.userInfoEndpoint).toBe(process.env.REAL_USER_INFO_ENDPOINT)
      expect(process.env.oidcjwksEndpoint).toBe(process.env.REAL_OIDCJWKS_ENDPOINT)
      expect(process.env.jwtPrivateKeyArn).toBe(process.env.REAL_JWT_PRIVATE_KEY_ARN)
      expect(process.env.userPoolIdp).toBe(process.env.REAL_USER_POOL_IDP)
      expect(process.env.useSignedJWT).toBe(process.env.REAL_USE_SIGNED_JWT)
      expect(process.env.oidcClientId).toBe(process.env.REAL_OIDC_CLIENT_ID)
      expect(process.env.oidcIssuer).toBe(process.env.REAL_OIDC_ISSUER)
    })

  it(
    "should use mock environment variables when MOCK_MODE_ENABLED is true " +
    "and username starts with Mock_",
    async () => {
      process.env.MOCK_MODE_ENABLED = "true"
      process.env.MOCK_IDP_TOKEN_PATH = "/mock/idp/token"
      process.env.MOCK_USER_INFO_ENDPOINT = "https://mock-userinfo.com"
      process.env.MOCK_OIDCJWKS_ENDPOINT = "https://mock-jwks.com"
      process.env.MOCK_JWT_PRIVATE_KEY_ARN = "arn:aws:ssm:region:account-id:parameter/mock-key"
      process.env.MOCK_USER_POOL_IDP = "MockPoolIdentityProvider"
      process.env.MOCK_USE_SIGNED_JWT = "false"
      process.env.MOCK_OIDC_CLIENT_ID = "mock-client-id"
      process.env.MOCK_OIDC_ISSUER = "https://mock-oidc-issuer.com"

      mockGetUsernameFromEvent.mockReturnValue("Mock_JaneDoe")

      await handler(event, context)
      expect(process.env.idpTokenPath).toBe(process.env.MOCK_IDP_TOKEN_PATH)
      expect(process.env.userInfoEndpoint).toBe(process.env.MOCK_USER_INFO_ENDPOINT)
      expect(process.env.oidcjwksEndpoint).toBe(process.env.MOCK_OIDCJWKS_ENDPOINT)
      expect(process.env.jwtPrivateKeyArn).toBe(process.env.MOCK_JWT_PRIVATE_KEY_ARN)
      expect(process.env.userPoolIdp).toBe(process.env.MOCK_USER_POOL_IDP)
      expect(process.env.useSignedJWT).toBe(process.env.MOCK_USE_SIGNED_JWT)
      expect(process.env.oidcClientId).toBe(process.env.MOCK_OIDC_CLIENT_ID)
      expect(process.env.oidcIssuer).toBe(process.env.MOCK_OIDC_ISSUER)
    })

  it(
    "should default to real environment variables if MOCK_MODE_ENABLED is true " +
    "but username does not start with Mock_",
    async () => {
      process.env.MOCK_MODE_ENABLED = "true"
      mockGetUsernameFromEvent.mockReturnValue("Primary_JohnDoe")
      await handler(event, context)
      // Should still use real because username doesn't start with Mock_
      expect(process.env.idpTokenPath).toBe(process.env.REAL_IDP_TOKEN_PATH)
      expect(process.env.userInfoEndpoint).toBe(process.env.REAL_USER_INFO_ENDPOINT)
      expect(process.env.oidcjwksEndpoint).toBe(process.env.REAL_OIDCJWKS_ENDPOINT)
    })

  it("should return 500 and log error when fetchAndVerifyCIS2Tokens throws an error", async () => {
    const error = new Error("Token verification failed")
    mockFetchAndVerifyCIS2Tokens.mockImplementation(async () => Promise.reject(error))

    console.log("???????????????????????")
    const response = await handler(event, context)
    console.log("response")
    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("Internal server error")
    expect(mockFetchUserInfo).not.toHaveBeenCalled()
    expect(mockUpdateDynamoTable).not.toHaveBeenCalled()
  })

  it("should return 500 and log error when fetchUserInfo throws an error", async () => {
    const error = new Error("User info fetch failed")
    mockFetchUserInfo.mockImplementation(async () => Promise.reject(error))

    const response = await handler(event, context)
    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("Internal server error")
    expect(mockUpdateDynamoTable).not.toHaveBeenCalled()
  })

  it("should return 500 and log error when updateDynamoTable throws an error", async () => {
    const error = new Error("Dynamo update failed")
    mockUpdateDynamoTable.mockImplementation(() => {
      throw error
    })

    const response = await handler(event, context)
    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("Internal server error")
  })

  it("should handle unexpected error types gracefully", async () => {
    mockUpdateDynamoTable.mockImplementation(() => {
      throw "Unexpected error string"
    })

    const response = await handler(event, context)
    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("Internal server error")
  })

  it("should call updateDynamoTable with the correct parameters", async () => {
    // const testUsername = "Primary_Tester"
    const testUsername = "Mock_555043304334"
    mockGetUsernameFromEvent.mockReturnValue(testUsername)
    const userInfoMock = {
      roles_with_access: ["roleX"],
      roles_without_access: ["roleY"],
      currently_selected_role: ["roleX"]
    }
    mockFetchUserInfo.mockReturnValue(userInfoMock)

    mockUpdateDynamoTable.mockImplementation(() => {
      console.log("!!!!!!!!!!!!!!!")
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
      expect.any(Object)
    )
  })
})
