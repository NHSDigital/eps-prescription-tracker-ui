import {jest} from "@jest/globals"
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"
import {Logger} from "@aws-lambda-powertools/logger"
import {TrackerUserInfo} from "@cpt-ui-common/authFunctions"

// Mocked functions from authFunctions
const mockAuthConfig = {
  oidcConfig: {oidcTokenEndpoint: "https://dummy.com/token"},
  tokenMappingTableName: "TokenMappingTable"
}
const mockUpdateDynamoTable = jest.fn()
const mockFetchDynamoTable = jest.fn<() => TrackerUserInfo>(() => ({
  roles_with_access: [
    {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"},
    {role_id: "456", org_code: "ABC", role_name: "MockRole_2"}
  ],
  roles_without_access: [],
  currently_selected_role: undefined, // Initially no role is selected
  user_details: {family_name: "Bloggs", given_name: "Joe"}
}))

jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  return {
    authenticateRequest: () => ({
      username: "Mock_JoeBloggs",
      apigeeAccessToken: "foo",
      roleId: "test-role"
    }),
    initializeAuthConfig: () => mockAuthConfig,
    fetchCachedUserInfo: mockFetchDynamoTable,
    updateCachedUserInfo: mockUpdateDynamoTable
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
  let context = mockContext

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
        currently_selected_role: {
          role_id: "123",
          org_code: "XYZ",
          role_name: "MockRole_1"
        },
        roles_with_access: [
          {
            role_id: "456",
            org_code: "ABC",
            role_name: "MockRole_2"
          }
        ],
        roles_without_access: [],
        user_details: {family_name: "Bloggs", given_name: "Joe"}
      }

      const response = await handler(event, context)

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
            currently_selected_role: {
              role_id: "123",
              org_code: "XYZ",
              role_name: "MockRole_1"
            },
            roles_with_access: [
              {
                role_id: "456",
                org_code: "ABC",
                role_name: "MockRole_2"
              }
            ],
            roles_without_access: [],
            user_details: {family_name: "Bloggs", given_name: "Joe"}
          }
        })
      })
    })

  it(
    "should swap currently_selected_role with the new selected role and move the old one back to roles_with_access",
    async () => {
      // Initial roles_with_access contains multiple roles, currently_selected_role is undefined
      mockFetchDynamoTable.mockImplementation(() => {
        return {
          roles_with_access: [
            {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"},
            {role_id: "456", org_code: "ABC", role_name: "MockRole_2"},
            {role_id: "789", org_code: "DEF", role_name: "MockRole_3"}
          ],
          currently_selected_role: undefined, // Initially no role is selected
          roles_without_access: [],
          user_details: {family_name: "Bloggs", given_name: "Joe"}
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
        currently_selected_role: {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"},
        roles_with_access: [
          {role_id: "456", org_code: "ABC", role_name: "MockRole_2"},
          {role_id: "789", org_code: "DEF", role_name: "MockRole_3"}
        ],
        roles_without_access: [],
        user_details: {family_name: "Bloggs", given_name: "Joe"}
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
        currently_selected_role: {role_id: "456", org_code: "ABC", role_name: "MockRole_2"},
        roles_with_access: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}, // Previously selected role moved back
          {role_id: "789", org_code: "DEF", role_name: "MockRole_3"}
        ],
        roles_without_access: [],
        user_details: {family_name: "Bloggs", given_name: "Joe"}
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
        currently_selected_role: {role_id: "789", org_code: "DEF", role_name: "MockRole_3"},
        roles_with_access: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"},
          {role_id: "456", org_code: "ABC", role_name: "MockRole_2"} // Previously selected role moved back
        ],
        roles_without_access: [],
        user_details: {family_name: "Bloggs", given_name: "Joe"}
      })
    }
  )

  it(
    "should swap initially selected role with the new selected role and move the old one back to rolesWithAccess",
    async () => {
      // Initial database state with a previously selected role
      mockFetchDynamoTable.mockImplementation(() => {
        return {
          roles_with_access: [
            {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"},
            {role_id: "456", org_code: "ABC", role_name: "MockRole_2"},
            {role_id: "789", org_code: "DEF", role_name: "MockRole_3"}
          ],
          currently_selected_role: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
          roles_without_access: [],
          user_details: {family_name: "Bloggs", given_name: "Joe"}
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
          currently_selected_role: {
            role_id: "123",
            org_code: "XYZ",
            role_name: "MockRole_1"
          },
          roles_with_access: [
            {role_id: "456", org_code: "ABC", role_name: "MockRole_2"},
            {role_id: "789", org_code: "DEF", role_name: "MockRole_3"},
            {role_id: "555", org_code: "GHI", role_name: "MockRole_4"} // Old role moved back
          ],
          roles_without_access: [],
          user_details: {family_name: "Bloggs", given_name: "Joe"}
        },
        expect.any(Object),
        expect.any(Object),
        expect.any(String)
      )

      // Now simulate switching to another role
      mockFetchDynamoTable.mockImplementation(() => firstResponseBody.userInfo)

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
          currently_selected_role: {
            role_id: "789",
            org_code: "DEF",
            role_name: "MockRole_3"
          },
          roles_with_access: [
            {role_id: "456", org_code: "ABC", role_name: "MockRole_2"},
            {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
            {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"} // Previously selected role moved back
          ],
          roles_without_access: [],
          user_details: {family_name: "Bloggs", given_name: "Joe"}
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
