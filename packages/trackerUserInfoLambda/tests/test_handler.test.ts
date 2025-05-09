import {jest} from "@jest/globals"
import {TrackerUserInfo} from "@cpt-ui-common/authFunctions"
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"

// Mocked functions from authFunctions
const mockGetUsernameFromEvent = jest.fn(() => "Mock_JoeBloggs")
const mockFetchAndVerifyCIS2Tokens = jest.fn(async () => {
  return {
    cis2IdToken: "idToken",
    cis2AccessToken: "cis2AccessToken"
  }
})
const mockAuthenticateRequest = jest.fn(() => ({
  username: "Mock_JoeBloggs",
  apigeeAccessToken: "apigeeAccessToken",
  roleId: "test-role"
}))
const mockUpdateDynamoTable = jest.fn()
const mockFetchDynamoTable = jest.fn()
const mockAuthConfig = {
  oidcConfig: {oidcTokenEndpoint: "https://dummy.com/token"},
  tokenMappingTableName: "TokenMappingTable"
}

jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  return {
    fetchAndVerifyCIS2Tokens: mockFetchAndVerifyCIS2Tokens,
    getUsernameFromEvent: mockGetUsernameFromEvent,
    authenticateRequest: mockAuthenticateRequest,
    initializeAuthConfig: () => mockAuthConfig,
    fetchCachedUserInfo: mockFetchDynamoTable,
    updateCachedUserInfo: mockUpdateDynamoTable
  }
})

// Mocked functions from userInfoHelpers
const mockUserInfo: TrackerUserInfo = {
  roles_with_access: [],
  roles_without_access: [],
  user_details: {family_name: "Doe", given_name: "John"}
}
const mockFetchUserInfo = jest.fn(() => mockUserInfo)
jest.unstable_mockModule("../src/userInfoHelpers", () => ({fetchUserInfo: mockFetchUserInfo}))

const {handler} = await import("../src/handler")

describe("Lambda Handler Tests", () => {
  let event = {...mockAPIGatewayProxyEvent}
  let context = {...mockContext}

  it("should fetch userInfo using CIS2 access token and cache it for CIS2 user", async () => {
    mockGetUsernameFromEvent.mockImplementation(() => "Primary_JoeBloggs")
    const response = await handler(event, context)
    expect(mockFetchAndVerifyCIS2Tokens).toHaveBeenCalledWith(
      event,
      expect.any(Object),
      expect.any(Object),
      mockAuthConfig.oidcConfig
    )
    expect(mockAuthenticateRequest).not.toHaveBeenCalled()

    expect(mockFetchUserInfo).toHaveBeenCalledWith(
      "cis2AccessToken",
      "idToken",
      expect.any(Array),
      expect.any(Object),
      "https://dummy.com/token"
    )

    expect(mockUpdateDynamoTable).toHaveBeenCalledWith(
      "Primary_JoeBloggs",
      mockUserInfo,
      expect.any(Object),
      expect.any(Object),
      "TokenMappingTable"
    )

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 200)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "UserInfo fetched successfully from the OIDC endpoint")
    expect(body).toHaveProperty("userInfo", mockUserInfo)
  })

  it("should fetch userInfo using apigee access token and cache it for mock user", async () => {
    mockGetUsernameFromEvent.mockImplementation(() => "Mock_JoeBloggs")
    const response = await handler(event, context)

    // Check that authenticateRequest was called, but don't be specific about exact parameters
    expect(mockAuthenticateRequest).toHaveBeenCalledWith(
      event,
      expect.any(Object),
      expect.any(Object),
      mockAuthConfig
    )
    expect(mockFetchAndVerifyCIS2Tokens).not.toHaveBeenCalled()

    // Check that fetchUserInfo was called with expected parameters (loosely)
    expect(mockFetchUserInfo).toHaveBeenCalledWith(
      "apigeeAccessToken",
      null,
      expect.any(Array),
      expect.any(Object),
      "https://dummy.com/token"
    )

    expect(mockUpdateDynamoTable).toHaveBeenCalledWith(
      "Mock_JoeBloggs",
      mockUserInfo,
      expect.any(Object),
      expect.any(Object),
      "TokenMappingTable"
    )

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 200)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "UserInfo fetched successfully from the OIDC endpoint")
    expect(body).toHaveProperty("userInfo", mockUserInfo)
  })

  it("should return cached user info if roles_with_access is not empty", async () => {
    const userInfoMock: TrackerUserInfo = {
      roles_with_access: [
        {role_name: "Doctor", role_id: "123", org_code: "ABC", org_name: "Test Hospital"}
      ],
      roles_without_access: [],
      currently_selected_role: {
        role_name: "Doctor",
        role_id: "123",
        org_code: "ABC",
        org_name: "Test Hospital"
      },
      user_details: {family_name: "Bloggs", given_name: "Joe"}
    }

    // Fix by explicitly casting to the expected return type
    mockFetchDynamoTable.mockResolvedValue(userInfoMock as never)

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("UserInfo fetched successfully from DynamoDB")

    const responseBody = JSON.parse(response.body)
    expect(responseBody.userInfo).toEqual(userInfoMock)
  })

  it("should return cached user info if roles_without_access is not empty", async () => {
    const userInfoMock: TrackerUserInfo = {
      roles_with_access: [],
      roles_without_access: [
        {role_name: "Doctor", role_id: "123", org_code: "ABC", org_name: "Test Hospital"}
      ],
      currently_selected_role: {
        role_name: "Doctor",
        role_id: "123",
        org_code: "ABC",
        org_name: "Test Hospital"
      },
      user_details: {family_name: "Bloggs", given_name: "Joe"}
    }

    mockFetchDynamoTable.mockResolvedValue(userInfoMock as never)

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("UserInfo fetched successfully from DynamoDB")

    const responseBody = JSON.parse(response.body)
    expect(responseBody.userInfo).toEqual(userInfoMock)
  })

  it("should return cached user info even if currently_selected_role is undefined", async () => {
    const userInfoMock: TrackerUserInfo = {
      roles_with_access: [
        {role_name: "Doctor", role_id: "123", org_code: "ABC", org_name: "Test Hospital"}
      ],
      roles_without_access: [],
      user_details: {family_name: "Bloggs", given_name: "Joe"}
    }

    mockFetchDynamoTable.mockResolvedValue(userInfoMock as never)

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("UserInfo fetched successfully from DynamoDB")

    const responseBody = JSON.parse(response.body)
    expect(responseBody.userInfo).toEqual(userInfoMock)
  })
})
