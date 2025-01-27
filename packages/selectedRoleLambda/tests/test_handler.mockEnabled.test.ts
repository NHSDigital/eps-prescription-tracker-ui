import {jest} from "@jest/globals"

// Mocked functions
const mockGetUsernameFromEvent = jest.fn()
const mockUpdateDynamoTable = jest.fn()

jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  return {
    getUsernameFromEvent: mockGetUsernameFromEvent.mockImplementation(() => "Mock_JoeBloggs")
  }
})

jest.unstable_mockModule("../src/selectedRoleHelpers", () => {
  return {
    updateDynamoTable: mockUpdateDynamoTable.mockImplementation(() => Promise.resolve())
  }
})

const {handler} = await import("../src/handler")
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"

describe("Lambda Handler Tests with mock enabled", () => {
  let event = {...mockAPIGatewayProxyEvent, body: JSON.stringify({role_id: "123", org_code: "XYZ"})}
  let context = {...mockContext}

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return a successful response with mock username", async () => {
    const response = await handler(event, context)

    expect(mockGetUsernameFromEvent).toHaveBeenCalled()
    expect(mockUpdateDynamoTable).toHaveBeenCalledWith(
      "Mock_JoeBloggs",
      {role_id: "123", org_code: "XYZ"},
      expect.any(Object),
      expect.any(Object),
      expect.any(String)
    )
    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify({
        message: "Selected role data has been updated successfully",
        userInfo: JSON.parse(event.body)
      })
    })
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
