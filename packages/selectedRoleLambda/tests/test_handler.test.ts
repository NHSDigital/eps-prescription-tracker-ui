import {jest} from "@jest/globals"
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"
import {Logger} from "@aws-lambda-powertools/logger"

// Mocked functions from authFunctions
const mockUpdateTokenMapping = jest.fn()
const mockGetTokenMapping = jest.fn()

jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  return {
    authParametersFromEnv: () => ({
      tokenMappingTableName: "TokenMappingTable"
    }),
    authenticationMiddleware: () => ({before: () => {}})
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
    event.requestContext.authorizer = {
      username: "JoeBlogs"
    }
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
      event.requestContext.authorizer = {
        username: "Mock_JoeBloggs"
      }
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

      expect(mockUpdateTokenMapping).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          username: testUsername,
          currentlySelectedRole,
          rolesWithAccess,
          selectedRoleId,
          lastActivityTime: expect.any(Number)
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
        }),
        requestContext: {
          authorizer: {
            username: "Mock_JoeBloggs"
          }
        }
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
        ...event,
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
        ...event,
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
        }),
        requestContext: {
          authorizer: {
            username: "Mock_JoeBloggs"
          }
        }
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
          selectedRoleId: "123",
          lastActivityTime: expect.any(Number)
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
        }),
        requestContext: {
          authorizer: {
            username: "Mock_JoeBloggs"
          }
        }
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
