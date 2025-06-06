import {jest} from "@jest/globals"
import {Logger} from "@aws-lambda-powertools/logger"
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"

// Mocked functions from authFunctions
const mockGetUsernameFromEvent = jest.fn()
const mockAuthenticateRequest = jest.fn()
const mockGetTokenMapping = jest.fn()
const mockInitializeOidcConfig = jest.fn()
const mockUpdateTokenMapping = jest.fn()
const mockFetchUserInfo = jest.fn()

mockInitializeOidcConfig.mockImplementation( () => {
  const cis2OidcConfig = {
    oidcIssuer: process.env["CIS2_OIDC_ISSUER"] ?? "",
    oidcClientID: process.env["CIS2_OIDC_CLIENT_ID"] ?? "",
    oidcJwksEndpoint: process.env["CIS2_OIDCJWKS_ENDPOINT"] ?? "",
    oidcUserInfoEndpoint: process.env["CIS2_USER_INFO_ENDPOINT"] ?? "",
    userPoolIdp: process.env["CIS2_USER_POOL_IDP"] ?? "",
    jwksClient: undefined,
    tokenMappingTableName: process.env["TokenMappingTableName"] ?? "",
    oidcTokenEndpoint: process.env["CIS2_TOKEN_ENDPOINT"] ?? ""
  }
  const mockOidcConfig = {
    oidcIssuer: process.env["MOCK_OIDC_ISSUER"] ?? "",
    oidcClientID: process.env["MOCK_OIDC_CLIENT_ID"] ?? "",
    oidcJwksEndpoint: process.env["MOCK_OIDCJWKS_ENDPOINT"] ?? "",
    oidcUserInfoEndpoint: process.env["MOCK_USER_INFO_ENDPOINT"] ?? "",
    userPoolIdp: process.env["MOCK_USER_POOL_IDP"] ?? "",
    jwksClient: undefined,
    tokenMappingTableName: process.env["TokenMappingTableName"] ?? "",
    oidcTokenEndpoint: process.env["MOCK_OIDC_TOKEN_ENDPOINT"] ?? ""
  }

  return {cis2OidcConfig, mockOidcConfig}
})

jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    getTokenMapping: mockGetTokenMapping,
    updateTokenMapping: mockUpdateTokenMapping
  }
})
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  return {
    getUsernameFromEvent: mockGetUsernameFromEvent,
    authenticateRequest: mockAuthenticateRequest,
    initializeOidcConfig: mockInitializeOidcConfig,
    fetchUserInfo: mockFetchUserInfo
  }
})

const {handler} = await import("../src/handler")

describe("Lambda Handler Tests with mock disabled", () => {
  let event = {...mockAPIGatewayProxyEvent}
  let context = {...mockContext}

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("should return a successful response when cached details returned", async () => {
    mockGetTokenMapping.mockImplementation(() => {
      return {
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [],
        currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        userDetails: {
          family_name: "foo",
          given_name: "bar"
        }
      }
    })
    const response = await handler(event, context)

    expect(mockAuthenticateRequest).not.toHaveBeenCalled()

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 200)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "UserInfo fetched successfully from DynamoDB")
    expect(body).toHaveProperty("userInfo")
  })

  it("should return a successful response when no cached details returned", async () => {
    mockGetTokenMapping.mockImplementation(() => {
      return {
        userDetails: {
          family_name: "foo",
          given_name: "bar"
        },
        cis2IdToken: "cis2_id_token",
        cis2AccessToken: "cis2_access_token"
      }
    })
    mockGetUsernameFromEvent.mockReturnValue("test_user")
    mockAuthenticateRequest.mockImplementation(() => {
      return Promise.resolve({
        apigeeAccessToken: "apigee_access_token"
      })
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
    const response = await handler(event, context)

    expect(mockAuthenticateRequest).toHaveBeenCalled()

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 200)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "UserInfo fetched successfully from the OIDC endpoint")
    expect(body).toHaveProperty("userInfo")
    expect(mockUpdateTokenMapping).toHaveBeenCalled()
  })

  it("should return error when a mock token and no apigee access token", async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, "error")

    mockGetTokenMapping.mockImplementation(() => {
      return {
        userDetails: {
          family_name: "foo",
          given_name: "bar"
        },
        cis2IdToken: "cis2_id_token",
        cis2AccessToken: "cis2_access_token"
      }
    })
    mockGetUsernameFromEvent.mockReturnValue("Mock_test_user")
    mockAuthenticateRequest.mockImplementation(() => {
      return Promise.resolve({})
    })

    const response = await handler(event, context)

    // Check response format matches what the middleware produces
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "Error: Authentication failed for mock: missing tokens"
    )
  })

  it("should return error when not a mock token and no cis access token", async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, "error")

    mockGetTokenMapping.mockImplementation(() => {
      return {
        userDetails: {
          family_name: "foo",
          given_name: "bar"
        },
        cis2AccessToken: "cis2_access_token"
      }
    })
    mockGetUsernameFromEvent.mockReturnValue("test_user")
    mockAuthenticateRequest.mockImplementation(() => {
      return Promise.resolve({
        apigeeAccessToken: "apigee_access_token"
      })
    })

    const response = await handler(event, context)

    // Check response format matches what the middleware produces
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "Error: Authentication failed for cis2: missing tokens"
    )
  })

  it("should return error when authenticateRequest throws an error", async () => {
    const error = new Error("Token verification failed")
    const loggerSpy = jest.spyOn(Logger.prototype, "error")

    mockGetUsernameFromEvent.mockReturnValue("test_user")
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
  })

  it("should return user info if roles_with_access is not empty", async () => {
    mockGetTokenMapping.mockImplementation(() => {
      return {
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [],
        currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        userDetails: {
          family_name: "Doe",
          given_name: "John"
        }
      }
    })

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("UserInfo fetched successfully from DynamoDB")

    const responseBody = JSON.parse(response.body)
    expect(responseBody.userInfo).toEqual({
      "currently_selected_role": {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
      "roles_with_access": [
        {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
      ],
      "roles_without_access": [],
      "user_details": {"family_name": "Doe", "given_name": "John"}}
    )
  })

  it("should return user info if roles_without_access is not empty", async () => {
    mockGetTokenMapping.mockImplementation(() => {
      return {
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [
          {role_name: "Receptionist", role_id: "456", org_code: "DEF", org_name: "Test Hospital"}
        ],
        currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        userDetails: {
          family_name: "Doe",
          given_name: "John"
        }
      }
    })

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("UserInfo fetched successfully from DynamoDB")

    const responseBody = JSON.parse(response.body)
    expect(responseBody.userInfo).toEqual({
      "currently_selected_role": {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
      "roles_with_access": [
        {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
      ],
      "roles_without_access": [
        {role_name: "Receptionist", role_id: "456", org_code: "DEF", org_name: "Test Hospital"}
      ],
      "user_details": {"family_name": "Doe", "given_name": "John"}}
    )
  })

  it("should return cached user info even if currently_selected_role is undefined", async () => {
    mockGetTokenMapping.mockImplementation(() => {
      return {
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [
          {role_name: "Receptionist", role_id: "456", org_code: "DEF", org_name: "Test Hospital"}
        ],
        currentlySelectedRole: {},
        userDetails: {
          family_name: "Doe",
          given_name: "John"
        }
      }
    })
    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("UserInfo fetched successfully from DynamoDB")

    const responseBody = JSON.parse(response.body)
    expect(responseBody.userInfo).toEqual({
      "currently_selected_role":  {},
      "roles_with_access": [
        {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
      ],
      "roles_without_access": [
        {role_name: "Receptionist", role_id: "456", org_code: "DEF", org_name: "Test Hospital"}
      ],
      "user_details": {"family_name": "Doe", "given_name": "John"}}
    )
  })

})
