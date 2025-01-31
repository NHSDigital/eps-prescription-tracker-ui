import {jest} from "@jest/globals"

// Mocked functions from authFunctions
const mockGetUsernameFromEvent = jest.fn()

jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  const getUsernameFromEvent = mockGetUsernameFromEvent.mockImplementation(() => "Mock_JoeBloggs")

  return {
    getUsernameFromEvent
  }
})

// Mocked functions from selectedRoleHelpers
const mockFetchDynamoRolesWithAccess = jest.fn()
const mockUpdateDynamoTable = jest.fn()

jest.unstable_mockModule("@/selectedRoleHelpers", () => {
  const fetchDynamoRolesWithAccess = mockFetchDynamoRolesWithAccess.mockImplementation(() => {
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
    fetchDynamoRolesWithAccess,
    updateDynamoTable
  }
})

const {handler} = await import("@/handler")
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"
import {Logger} from "@aws-lambda-powertools/logger"

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
        // The selected role has been moved from roles_with_access to currently_selected_role
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
