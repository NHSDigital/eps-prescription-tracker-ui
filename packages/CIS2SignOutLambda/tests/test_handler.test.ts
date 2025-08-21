import {jest} from "@jest/globals"
import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"

// Mocked functions
const mockTryGetTokenMapping = jest.fn()
const mockGetUsernameFromEvent = jest.fn()
const mockGetSessionIdFromEvent = jest.fn()
const mockDeleteTokenMapping = jest.fn()
const mockDeleteRecordAllowFailures = jest.fn()

jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    tryGetTokenMapping: mockTryGetTokenMapping,
    deleteTokenMapping: mockDeleteTokenMapping,
    deleteRecordAllowFailures: mockDeleteRecordAllowFailures
  }
})
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  return {
    getUsernameFromEvent: mockGetUsernameFromEvent,
    getSessionIdFromEvent: mockGetSessionIdFromEvent
  }
})

const {handler} = await import("../src/handler")

describe("Lambda Handler", () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  it("should return 200 and success message on successful deletion", async () => {
    mockGetUsernameFromEvent.mockReturnValue("username234")
    mockGetSessionIdFromEvent.mockReturnValue("123456")
    const tokenMappingItem = {
      username: "username234",
      sessionId: "123456",
      accessToken: "test-token-access-token",
      refreshToken: "test-token-refresh-token",
      expiresAt: Date.now() + 3600000
    }
    mockTryGetTokenMapping.mockReturnValueOnce(tokenMappingItem)

    const response = await handler(mockAPIGatewayProxyEvent, mockContext)

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("CIS2 logout completed")

    // Verify that DeleteCommand was called with the expected parameters
    expect(mockDeleteTokenMapping).toHaveBeenCalledWith(
      expect.anything(),
      process.env.TokenMappingTableName,
      "username234",
      expect.anything()
    )
    expect(mockDeleteRecordAllowFailures).not.toHaveBeenCalled()
  })

  it("should return 200 and success message on successful deletion of concurrent session", async () => {
    mockGetUsernameFromEvent.mockReturnValue("username234")
    mockGetSessionIdFromEvent.mockReturnValue("98765")
    const tokenMappingItem = {
      username: "username234",
      sessionId: "123456",
      accessToken: "test-token-access-token",
      refreshToken: "test-token-refresh-token",
      expiresAt: Date.now() + 3600000
    }
    mockTryGetTokenMapping.mockReturnValueOnce(tokenMappingItem)

    const response = await handler(mockAPIGatewayProxyEvent, mockContext)

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("CIS2 logout completed")

    // Verify that DeleteCommand was called with the expected parameters
    expect(mockDeleteRecordAllowFailures).toHaveBeenCalledWith(
      expect.anything(),
      process.env.SessionManagementTableName,
      "username234",
      expect.anything()
    )
    expect(mockDeleteTokenMapping).not.toHaveBeenCalled()
  })

  it("should return error message if deletion is unsuccessful", async () => {
    mockTryGetTokenMapping.mockImplementationOnce(() => Promise.reject(new Error("there was a problem")))

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
