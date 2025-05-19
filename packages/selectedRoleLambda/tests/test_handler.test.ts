import {jest} from "@jest/globals"
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"
import {Logger} from "@aws-lambda-powertools/logger"

// Mocked functions from authFunctions
const mockGetUsernameFromEvent = jest.fn()
const mockInitializeOidcConfig = jest.fn()
const mockUpdateTokenMapping = jest.fn()
const mockGetTokenMapping = jest.fn()

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

jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {

  return {
    getUsernameFromEvent: mockGetUsernameFromEvent,
    initializeOidcConfig: mockInitializeOidcConfig
  }
})

jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {

  return {
    updateTokenMapping: mockUpdateTokenMapping,
    getTokenMapping: mockGetTokenMapping
  }
})

const {handler} = await import("../src/handler")

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

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("should return a successful response when called", async () => {
    mockGetUsernameFromEvent.mockReturnValue("JoeBlogs")
    const response = await handler(event, context)
    expect(mockUpdateTokenMapping).toHaveBeenCalled()

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
      mockGetUsernameFromEvent.mockReturnValue("Mock_JoeBloggs")
      mockGetTokenMapping.mockImplementation(() => {
        return {
          rolesWithAccess:  [
            {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"},
            {role_id: "456", org_code: "ABC", role_name: "MockRole_2"}
          ],
          currentlySelectedRole: undefined // Initially no role is selected
        }
      })
      const testUsername = "Mock_JoeBloggs"
      const currentlySelectedRole = {
        role_id: "123",
        org_code: "XYZ",
        role_name: "MockRole_1"
      }
      const rolesWithAccess = [
        {
          role_id: "456",
          org_code: "ABC",
          role_name: "MockRole_2"
        }
      ]
      const selectedRoleId = "123"

      const response = await handler(event, context)

      expect(mockGetUsernameFromEvent).toHaveBeenCalled()
      expect(mockUpdateTokenMapping).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          username: testUsername,
          currentlySelectedRole,
          rolesWithAccess,
          selectedRoleId
        },
        expect.anything()
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
      mockGetUsernameFromEvent.mockReturnValue("Mock_JoeBloggs")
      // Initial rolesWithAccess contains multiple roles, currentlySelectedRole is undefined
      mockGetTokenMapping.mockImplementation(() => {
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
      mockGetUsernameFromEvent.mockReturnValue("Mock_JoeBloggs")
      // Initial database state with a previously selected role
      mockGetTokenMapping.mockImplementation(() => {
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

      expect(mockUpdateTokenMapping).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          username: "Mock_JoeBloggs",
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
        expect.anything()
      )

      // Now simulate switching to another role
      mockGetTokenMapping.mockImplementation(() => firstResponseBody.userInfo)

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
    mockGetUsernameFromEvent.mockReturnValue("Mock_JoeBloggs")
    const error = new Error("Dynamo update failed")
    const loggerSpy = jest.spyOn(Logger.prototype, "error")
    mockUpdateTokenMapping.mockImplementation(() => {
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
    mockGetUsernameFromEvent.mockReturnValue("Mock_JoeBloggs")
    mockUpdateTokenMapping.mockImplementation(() => {
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
    mockGetUsernameFromEvent.mockReturnValue("Mock_JoeBloggs")
    event.body = "" as unknown as string
    const response = await handler(event, context)

    expect(response.statusCode).toBe(400)
    expect(response.body).toContain("Request body is required")
  })

  it("should return 400 when request body is invalid JSON", async () => {
    mockGetUsernameFromEvent.mockReturnValue("Mock_JoeBloggs")
    event.body = "Invalid JSON"
    const response = await handler(event, context)

    expect(response.statusCode).toBe(400)
    expect(response.body).toContain("Invalid JSON format in request body")
  })

})
