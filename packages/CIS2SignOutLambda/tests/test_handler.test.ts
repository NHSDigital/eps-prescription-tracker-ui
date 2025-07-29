import {jest} from "@jest/globals"
import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"

// Mocked functions
const mockGetUsernameFromEvent = jest.fn()
const mockDeleteTokenMappingMock = jest.fn()
const mockDeleteSessionManagementRecord = jest.fn()

jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    deleteTokenMapping: mockDeleteTokenMappingMock,
    deleteSessionManagementRecord: mockDeleteSessionManagementRecord
  }
})
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  return {
    getUsernameFromEvent: mockGetUsernameFromEvent
  }
})

const {handler} = await import("../src/handler")

describe("Lambda Handler", () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  it("should return 200 and success message on successful deletion", async () => {
    mockGetUsernameFromEvent.mockReturnValue("test_user")
    const response = await handler(mockAPIGatewayProxyEvent, mockContext)

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("CIS2 logout completed")

    // Verify that DeleteCommand was called with the expected parameters
    expect(mockDeleteTokenMappingMock).toHaveBeenCalledWith(
      expect.anything(),
      process.env.TokenMappingTableName,
      "test_user",
      expect.anything()
    )
  })

  it("should return 200 and success message on successful deletion of concurrent session", async () => {
    mockGetUsernameFromEvent.mockReturnValue("test_user")

    mockAPIGatewayProxyEvent.headers["concurrent-session"] = true
    const response = await handler(mockAPIGatewayProxyEvent, mockContext)

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("CIS2 logout completed")

    // Verify that DeleteCommand was called with the expected parameters
    expect(mockDeleteSessionManagementRecord).toHaveBeenCalledWith(
      expect.anything(),
      process.env.SessionManagementTableName,
      "test_user",
      "123456",
      expect.anything()
    )
    mockAPIGatewayProxyEvent.headers["concurrent-session"] = false
  })

  it("should return error message if deletion is unsuccessful", async () => {
    mockDeleteTokenMappingMock.mockImplementationOnce(() => Promise.reject(new Error("there was a problem")))

    const response = await handler(mockAPIGatewayProxyEvent, mockContext)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })
  })

  it("should throw an error when a mock user is used while mock mode is disabled", async () => {
    process.env.MOCK_MODE_ENABLED = "false"
    mockGetUsernameFromEvent.mockReturnValue("Mock_test_user")
    const {handler} = await import("../src/handler")

    const response = await handler(mockAPIGatewayProxyEvent, mockContext)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })

    // don't forget to set this back!
    process.env.MOCK_MODE_ENABLED = "true"
  })
})
