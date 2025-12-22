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
        org_code: "WRONG", // org code and role name should be ignored in favor of DynamoDB values
        role_name: "wrongRoleName"
      }
    })
  }
  let context = {...mockContext}

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("should call updateDynamoTable with currentlySelectedRole and return success", async () => {
    event.requestContext.authorizer = {
      username: "Mock_JoeBloggs"
    }
    mockGetTokenMapping.mockImplementation(() => {
      return {
        rolesWithAccess: [
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
    const selectedRoleId = "123"

    const response = await handler(event, context)

    expect(mockUpdateTokenMapping).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        username: testUsername,
        currentlySelectedRole,
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
          currentlySelectedRole,
          selectedRoleId: "123"
        }
      })
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
