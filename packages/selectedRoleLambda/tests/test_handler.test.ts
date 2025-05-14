import {jest} from "@jest/globals"
import jwksClient from "jwks-rsa"

const apigeeCIS2TokenEndpoint = process.env.apigeeCIS2TokenEndpoint
const apigeeMockTokenEndpoint = process.env.apigeeMockTokenEndpoint
const TokenMappingTableName = process.env.TokenMappingTableName

// Mocked functions from authFunctions
const mockGetUsernameFromEvent = jest.fn()
const mockExchangeTokenForApigeeAccessToken = jest.fn()
const mockUpdateTokenMapping = jest.fn()
const mockInitializeOidcConfig = jest.fn()

jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  const getUsernameFromEvent = mockGetUsernameFromEvent.mockImplementation(() => "Mock_JoeBloggs")

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
      oidcTokenEndpoint: process.env["CIS2_IDP_TOKEN_PATH"] ?? "",
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
      oidcTokenEndpoint: process.env["MOCK_IDP_TOKEN_PATH"] ?? "",
      jwksClient: mockJwksClient,
      tokenMappingTableName: process.env["TokenMappingTableName"] ?? ""
    }

    return {cis2OidcConfig, mockOidcConfig}
  })

  const authenticateRequest = jest.fn().mockImplementation(async (event) => {
    // Get the username and check if it's a mock user
    const username = mockGetUsernameFromEvent(event) as string

    // Call the appropriate token endpoint based on username
    if (typeof username === "string") {
      if (username.startsWith("Mock_")) {
        // Simulate calling the mock token endpoint
        mockExchangeTokenForApigeeAccessToken.mockImplementationOnce(() => ({
          accessToken: "foo",
          expiresIn: 100,
          refreshToken: "refresh-token"
        }))

        await mockExchangeTokenForApigeeAccessToken(
          expect.anything(),
          apigeeMockTokenEndpoint,
          expect.anything(),
          expect.anything()
        )
      } else if (username.startsWith("Primary_")) {
        // Simulate calling the CIS2 token endpoint
        mockExchangeTokenForApigeeAccessToken.mockImplementationOnce(() => ({
          accessToken: "foo",
          expiresIn: 100,
          refreshToken: "refresh-token"
        }))

        await mockExchangeTokenForApigeeAccessToken(
          expect.anything(),
          apigeeCIS2TokenEndpoint,
          expect.anything(),
          expect.anything()
        )
      }
    }

    // Always make sure updateTokeMapping is called with the expected arguments
    mockUpdateTokenMapping(
      expect.anything(),
      TokenMappingTableName,
      username,
      "foo",
      100,
      expect.anything()
    )

    return {
      username,
      apigeeAccessToken: "foo",
      cis2IdToken: "mock-id-token",
      roleId: "test-role",
      isMockRequest: typeof username === "string" && username.startsWith("Mock_")
    }
  })

  return {
    getUsernameFromEvent,
    authenticateRequest,
    initializeOidcConfig
  }
})

// Mocked functions from selectedRoleHelpers
const mockFetchUserRolesFromDynamoDB = jest.fn()
const mockUpdateDynamoTable = jest.fn()

jest.unstable_mockModule("@/selectedRoleHelpers", () => {
  const fetchUserRolesFromDynamoDB = mockFetchUserRolesFromDynamoDB.mockImplementation(() => {
    return {
      rolesWithAccess: [
        {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"},
        {role_id: "456", org_code: "ABC", role_name: "MockRole_2"}
      ],
      currentlySelectedRole: undefined // Initially no role is selected
    }
  })

  const updateDynamoTable = mockUpdateDynamoTable.mockImplementation(() => {})

  return {
    fetchUserRolesFromDynamoDB,
    updateDynamoTable
  }
})

const {handler} = await import("../src/handler")
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"
import {Logger} from "@aws-lambda-powertools/logger"
import {OidcConfig} from "@cpt-ui-common/authFunctions"

describe("Lambda Handler Tests", () => {
  let event = {
    ...mockAPIGatewayProxyEvent,
    body: JSON.stringify({
      currently_selected_role: {
        role_id: "123",
        org_code: "XYZ",
        role_name: "MockRole_1"
      }
    })
  }
  let context = {...mockContext}

  beforeAll(() => {
    jest.clearAllMocks()
  })

  it("should return a successful response when called", async () => {
    const response = await handler(event, context)
    expect(mockUpdateDynamoTable).toHaveBeenCalled()

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 200)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "Selected role data has been updated successfully")
    expect(body).toHaveProperty("userInfo")
  })

  it(
    "should call updateDynamoTable and move the selected role from rolesWithAccess to currentlySelectedRole",
    async () => {
      const testUsername = "Mock_JoeBloggs"
      const updatedUserInfo = {
        // The selected role has been moved from rolesWithAccess to currentlySelectedRole
        currentlySelectedRole: {
          role_id: "123",
          org_code: "XYZ",
          role_name: "MockRole_1"
        },
        rolesWithAccess: [
          {
            role_id: "456",
            org_code: "ABC",
            role_name: "MockRole_2"
          }
        ],
        selectedRoleId: "123"
      }

      const response = await handler(event, context)

      expect(mockGetUsernameFromEvent).toHaveBeenCalled()
      expect(mockUpdateDynamoTable).toHaveBeenCalledWith(
        testUsername,
        updatedUserInfo,
        expect.any(Object),
        expect.any(Object),
        expect.any(String)
      )
      expect(response).toEqual({
        statusCode: 200,
        body: JSON.stringify({
          message: "Selected role data has been updated successfully",
          userInfo: {
            currentlySelectedRole: {
              role_id: "123",
              org_code: "XYZ",
              role_name: "MockRole_1"
            },
            rolesWithAccess: [
              {
                role_id: "456",
                org_code: "ABC",
                role_name: "MockRole_2"
              }
            ],
            selectedRoleId: "123"
          }
        })
      })
    })

  it(
    "should swap currentlySelectedRole with the new selected role and move the old one back to rolesWithAccess",
    async () => {
      // Initial rolesWithAccess contains multiple roles, currentlySelectedRole is undefined
      mockFetchUserRolesFromDynamoDB.mockImplementation(() => {
        return {
          rolesWithAccess: [
            {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"},
            {role_id: "456", org_code: "ABC", role_name: "MockRole_2"},
            {role_id: "789", org_code: "DEF", role_name: "MockRole_3"}
          ],
          currentlySelectedRole: undefined // Initially no role is selected
        }
      })

      // User selects "MockRole_1" (role_id: 123)
      let event = {
        ...mockAPIGatewayProxyEvent,
        body: JSON.stringify({
          currently_selected_role: {
            role_id: "123",
            org_code: "XYZ",
            role_name: "MockRole_1"
          }
        })
      }

      let response = await handler(event, mockContext)
      let firstResponseBody = JSON.parse(response.body)

      expect(firstResponseBody.userInfo).toEqual({
        currentlySelectedRole: {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"},
        rolesWithAccess: [
          {role_id: "456", org_code: "ABC", role_name: "MockRole_2"},
          {role_id: "789", org_code: "DEF", role_name: "MockRole_3"}
        ],
        selectedRoleId: "123"
      })

      // User selects "MockRole_2" (role_id: 456)
      event = {
        ...mockAPIGatewayProxyEvent,
        body: JSON.stringify({
          currently_selected_role: {
            role_id: "456",
            org_code: "ABC",
            role_name: "MockRole_2"
          }
        })
      }

      response = await handler(event, mockContext)
      let secondResponseBody = JSON.parse(response.body)

      expect(secondResponseBody.userInfo).toEqual({
        currentlySelectedRole: {role_id: "456", org_code: "ABC", role_name: "MockRole_2"},
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}, // Previously selected role moved back
          {role_id: "789", org_code: "DEF", role_name: "MockRole_3"}
        ],
        selectedRoleId: "456"
      })

      // User selects "MockRole_3" (role_id: 789)
      event = {
        ...mockAPIGatewayProxyEvent,
        body: JSON.stringify({
          currently_selected_role: {
            role_id: "789",
            org_code: "DEF",
            role_name: "MockRole_3"
          }
        })
      }

      response = await handler(event, mockContext)
      let thirdResponseBody = JSON.parse(response.body)

      expect(thirdResponseBody.userInfo).toEqual({
        currentlySelectedRole: {role_id: "789", org_code: "DEF", role_name: "MockRole_3"},
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"},
          {role_id: "456", org_code: "ABC", role_name: "MockRole_2"} // Previously selected role moved back
        ],
        selectedRoleId: "789"
      })
    }
  )

  it(
    "should swap initially selected role with the new selected role and move the old one back to rolesWithAccess",
    async () => {
      // Initial database state with a previously selected role
      mockFetchUserRolesFromDynamoDB.mockImplementation(() => {
        return {
          rolesWithAccess: [
            {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"},
            {role_id: "456", org_code: "ABC", role_name: "MockRole_2"},
            {role_id: "789", org_code: "DEF", role_name: "MockRole_3"}
          ],
          currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"} // Initially selected role
        }
      })

      // First role selection: Change to "MockRole_1"
      const firstEvent = {
        ...mockAPIGatewayProxyEvent,
        body: JSON.stringify({
          currently_selected_role: {
            role_id: "123",
            org_code: "XYZ",
            role_name: "MockRole_1"
          }
        })
      }

      const firstResponse = await handler(firstEvent, mockContext)
      const firstResponseBody = JSON.parse(firstResponse.body)

      expect(mockUpdateDynamoTable).toHaveBeenCalledWith(
        "Mock_JoeBloggs",
        {
          currentlySelectedRole: {
            role_id: "123",
            org_code: "XYZ",
            role_name: "MockRole_1"
          },
          rolesWithAccess: [
            {role_id: "456", org_code: "ABC", role_name: "MockRole_2"},
            {role_id: "789", org_code: "DEF", role_name: "MockRole_3"},
            {role_id: "555", org_code: "GHI", role_name: "MockRole_4"} // Old role moved back
          ],
          selectedRoleId: "123"
        },
        expect.any(Object),
        expect.any(Object),
        expect.any(String)
      )

      // Now simulate switching to another role
      mockFetchUserRolesFromDynamoDB.mockImplementation(() => firstResponseBody.userInfo)

      const secondEvent = {
        ...mockAPIGatewayProxyEvent,
        body: JSON.stringify({
          currently_selected_role: {
            role_id: "789",
            org_code: "DEF",
            role_name: "MockRole_3"
          }
        })
      }

      const secondResponse = await handler(secondEvent, mockContext)
      const secondResponseBody = JSON.parse(secondResponse.body)

      expect(secondResponseBody).toEqual({
        message: "Selected role data has been updated successfully",
        userInfo: {
          currentlySelectedRole: {
            role_id: "789",
            org_code: "DEF",
            role_name: "MockRole_3"
          },
          rolesWithAccess: [
            {role_id: "456", org_code: "ABC", role_name: "MockRole_2"},
            {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
            {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"} // Previously selected role moved back
          ],
          selectedRoleId: "789"
        }
      })
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

  it("should return 400 when request body is missing", async () => {
    event.body = "" as unknown as string
    const response = await handler(event, context)

    expect(response.statusCode).toBe(400)
    expect(response.body).toContain("Request body is required")
  })

  it("should return 400 when request body is invalid JSON", async () => {
    event.body = "Invalid JSON"
    const response = await handler(event, context)

    expect(response.statusCode).toBe(400)
    expect(response.body).toContain("Invalid JSON format in request body")
  })

})
