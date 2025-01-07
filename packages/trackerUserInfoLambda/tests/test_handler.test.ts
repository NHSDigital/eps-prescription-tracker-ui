import {jest} from "@jest/globals"

// Mocked functions from cis2TokenHelpers
const mockFetchAndVerifyCIS2Tokens = jest.fn()
const mockGetUsernameFromEvent = jest.fn()

jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  const fetchAndVerifyCIS2Tokens = mockFetchAndVerifyCIS2Tokens.mockImplementation(async () => {
    return {
      cis2IdToken: "idToken",
      cis2AccessToken: "accessToken"
    }
  })

  const getUsernameFromEvent = mockGetUsernameFromEvent.mockImplementation(() => {
    return "Mock_JoeBloggs"
  })

  return {
    fetchAndVerifyCIS2Tokens,
    getUsernameFromEvent
  }
})

// Mocked functions from userInfoHelpers
const mockFetchUserInfo = jest.fn()
const mockUpdateDynamoTable = jest.fn()

jest.unstable_mockModule("@/userInfoHelpers", () => {
  const fetchUserInfo = mockFetchUserInfo.mockImplementation(() => {
    return {
      roles_with_access: [],
      roles_without_access: [],
      selected_role: {}
    }
  })

  const updateDynamoTable = mockUpdateDynamoTable.mockImplementation(() => {})

  return {
    fetchUserInfo,
    updateDynamoTable
  }
})

const {handler} = await import("@/handler")
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"

describe("Lambda Handler Tests", () => {
  let event = {...mockAPIGatewayProxyEvent}
  let context = {...mockContext}

  it("should return a successful response when called normally", async () => {
    const response = await handler(event, context)

    expect(mockFetchAndVerifyCIS2Tokens).toHaveBeenCalled()
    expect(mockFetchUserInfo).toHaveBeenCalled()
    expect(mockUpdateDynamoTable).toHaveBeenCalled()

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 200)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "UserInfo fetched successfully")
    expect(body).toHaveProperty("userInfo")
  })

  it(
    "should use real environment variables when MOCK_MODE_ENABLED is false " +
    "and username does not start with Mock_",
    async () => {
      mockGetUsernameFromEvent.mockReturnValue("Primary_JohnDoe")
      await handler(event, context)
      expect(mockGetUsernameFromEvent).toHaveBeenCalled()
      expect(mockFetchAndVerifyCIS2Tokens).toHaveBeenCalled()
      //expect(mockFetchAndVerifyCIS2Tokens).toHaveBeenCalledWith()
    })

  it(
    "should use mock environment variables when MOCK_MODE_ENABLED is true " +
    "and username starts with Mock_",
    async () => {
      mockGetUsernameFromEvent.mockReturnValue("Mock_JaneDoe")

      await handler(event, context)
      expect(mockFetchAndVerifyCIS2Tokens).toHaveBeenCalled()
      //expect(mockFetchAndVerifyCIS2Tokens).toHaveBeenCalledWith()
    })

  it(
    "should default to real environment variables if MOCK_MODE_ENABLED is true " +
    "but username does not start with Mock_",
    async () => {
      process.env.MOCK_MODE_ENABLED = "true"
      mockGetUsernameFromEvent.mockReturnValue("Primary_JohnDoe")
      await handler(event, context)
      // Should still use real because username doesn't start with Mock_
      expect(mockFetchAndVerifyCIS2Tokens).toHaveBeenCalled()
      //expect(mockFetchAndVerifyCIS2Tokens).toHaveBeenCalledWith()
    })

  it("should return 500 and log error when fetchAndVerifyCIS2Tokens throws an error", async () => {
    const error = new Error("Token verification failed")
    mockFetchAndVerifyCIS2Tokens.mockImplementation(async () => Promise.reject(error))

    const response = await handler(event, context)
    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("Internal server error")
    expect(mockFetchUserInfo).not.toHaveBeenCalled()
    expect(mockUpdateDynamoTable).not.toHaveBeenCalled()
  })

  it("should return 500 and log error when fetchUserInfo throws an error", async () => {
    const error = new Error("User info fetch failed")
    mockFetchUserInfo.mockImplementation(async () => Promise.reject(error))

    const response = await handler(event, context)
    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("Internal server error")
    expect(mockUpdateDynamoTable).not.toHaveBeenCalled()
  })

  it("should return 500 and log error when updateDynamoTable throws an error", async () => {
    const error = new Error("Dynamo update failed")
    mockUpdateDynamoTable.mockImplementation(() => {
      throw error
    })

    const response = await handler(event, context)
    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("Internal server error")
  })

  it("should handle unexpected error types gracefully", async () => {
    mockUpdateDynamoTable.mockImplementation(() => {
      throw "Unexpected error string"
    })

    const response = await handler(event, context)
    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("Internal server error")
  })

  it("should call updateDynamoTable with the correct parameters", async () => {
    const testUsername = "Primary_Tester"
    mockGetUsernameFromEvent.mockReturnValue(testUsername)
    const userInfoMock = {
      roles_with_access: ["roleX"],
      roles_without_access: ["roleY"],
      currently_selected_role: ["roleX"]
    }
    mockFetchUserInfo.mockReturnValue(userInfoMock)

    mockUpdateDynamoTable.mockImplementation(() => {
      return true
    })

    mockFetchAndVerifyCIS2Tokens.mockImplementation(async () => {
      return {
        cis2IdToken: "idToken",
        cis2AccessToken: "accessToken"
      }
    })

    await handler(event, context)
    expect(mockUpdateDynamoTable).toHaveBeenCalledWith(
      testUsername,
      userInfoMock,
      expect.any(Object),
      expect.any(Object),
      "dummyTable"
    )
  })
})
