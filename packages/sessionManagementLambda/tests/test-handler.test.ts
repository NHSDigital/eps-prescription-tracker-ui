import {
  jest,
  expect,
  describe,
  it
} from "@jest/globals"
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"
import {TokenMappingItem} from "@cpt-ui-common/dynamoFunctions"

const mockTryGetTokenMapping = jest.fn().mockName("mockGetTokenMapping")
const mockInsertTokenMapping = jest.fn().mockName("mockInsertTokenMapping")
const mockDeleteTokenMapping = jest.fn().mockName("mockDeleteTokenMapping")

const mockInitializeOidcConfig = jest.fn().mockName("mockInitializeOidcConfig")
const mockFetchUserInfo = jest.fn().mockName("mockFetchUserInfo")
mockInitializeOidcConfig.mockImplementation(() => ({cis2OidcConfig: {}, mockOidcConfig: {}}))

jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    tryGetTokenMapping: mockTryGetTokenMapping,
    insertTokenMapping: mockInsertTokenMapping,
    deleteTokenMapping: mockDeleteTokenMapping
  }
})
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  return {
    authParametersFromEnv: () => ({
      tokenMappingTableName: "TokenMappingTable",
      sessionManagementTableName: "SessionManagementTable"
    }),
    authenticationConcurrentAwareMiddleware: () => ({before: () => {}}),
    initializeOidcConfig: mockInitializeOidcConfig,
    fetchUserInfo: mockFetchUserInfo
  }
})

const {handler} = await import("../src/handler")

describe("Unit test for session management lambda", function () {
  let event = {...mockAPIGatewayProxyEvent}
  let context = {...mockContext}

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("should update token mapping table if set-session action used", async () => {
    const sessionManagementItem: TokenMappingItem = {
      username: "blah",
      rolesWithAccess: [
        {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
      ],
      rolesWithoutAccess: [],
      currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
      lastActivityTime: 123456,
      userDetails: {
        family_name: "foo",
        given_name: "bar"
      },
      sessionId: "sessionid123"
    }

    mockTryGetTokenMapping.mockImplementation(() => {
      return sessionManagementItem
    })

    event.requestContext.authorizer = {
      username: "test-user",
      sessionId: "sessionid123"
    }

    event.body = JSON.stringify({action: "Set-Session"})

    const response = await handler(event, context)

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 202)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toEqual({
      "message": "Session set",
      "status": "Active"
    })
    expect(mockTryGetTokenMapping).toHaveBeenCalled()
    expect(mockInsertTokenMapping).toHaveBeenCalledWith(
      expect.anything(),
      "TokenMappingTable",
      sessionManagementItem,
      expect.anything()
    )
    expect(mockDeleteTokenMapping).toHaveBeenCalledWith(
      expect.anything(),
      "SessionManagementTable",
      "test-user",
      expect.anything()
    )
  })

  it("should fail if no action supplied in payload body", async () => {
    const sessionManagementItem: TokenMappingItem = {
      username: "test-user",
      rolesWithAccess: [
        {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
      ],
      rolesWithoutAccess: [],
      currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
      lastActivityTime: 123456,
      userDetails: {
        family_name: "foo",
        given_name: "bar"
      },
      sessionId: "sessionid123"
    }

    mockTryGetTokenMapping.mockImplementation(() => {
      return sessionManagementItem
    })

    event.requestContext.authorizer = {
      username: "test-user",
      sessionId: "sessionid123"
    }

    event.body = JSON.stringify({})
    // eslint-disable-next-line no-console
    console.log(event)
    const response = await handler(event, context)

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 500)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toEqual({
      "message": "No action specified"
    })
    expect(mockTryGetTokenMapping).toHaveBeenCalled()
  })

  it("should error if no username supplied", async () => {
    const sessionManagementItem = {
      username: "test-user",
      rolesWithAccess: [
        {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
      ],
      rolesWithoutAccess: [],
      currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
      lastActivityTime: 123456,
      userDetails: {
        family_name: "foo",
        given_name: "bar"
      },
      sessionId: "sessionid123"
    }

    mockTryGetTokenMapping.mockImplementation(() => {
      return sessionManagementItem
    })

    event.requestContext.authorizer = {
      sessionId: "sessionid123"
    }

    event.body = JSON.stringify({})

    const response = await handler(event, context)
    expect(response).toEqual({
      "message": "A system error has occurred"
    })
    expect(mockTryGetTokenMapping).not.toHaveBeenCalled()
  })

  it("should error if no sessionid supplied", async () => {
    const sessionManagementItem = {
      username: "test-user",
      rolesWithAccess: [
        {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
      ],
      rolesWithoutAccess: [],
      currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
      lastActivityTime: 123456,
      userDetails: {
        family_name: "foo",
        given_name: "bar"
      },
      sessionId: "sessionid123"
    }

    mockTryGetTokenMapping.mockImplementation(() => {
      return sessionManagementItem
    })

    event.requestContext.authorizer = {
      username: "username"
    }

    event.body = JSON.stringify({})

    const response = await handler(event, context)
    expect(response).toEqual({
      "message": "A system error has occurred"
    })
    expect(mockTryGetTokenMapping).not.toHaveBeenCalled()
  })

  it("should error if payload body is not json", async () => {
    const sessionManagementItem = {
      username: "test-user",
      rolesWithAccess: [
        {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
      ],
      rolesWithoutAccess: [],
      currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
      lastActivityTime: 123456,
      userDetails: {
        family_name: "foo",
        given_name: "bar"
      },
      sessionId: "sessionid123"
    }

    mockTryGetTokenMapping.mockImplementation(() => {
      return sessionManagementItem
    })

    event.requestContext.authorizer = {
      username: "username",
      sessionId: "12345"
    }

    event.body = btoa("I'm not JSON")

    const response = await handler(event, context)
    expect(response).toEqual({
      "message": "A system error has occurred"
    })
    expect(mockTryGetTokenMapping).not.toHaveBeenCalled()
  })

  it("should return error when sessionId is missing", async () => {
    event.requestContext.authorizer = {
      username: "test-user"
      // sessionId is missing
    }
    event.body = JSON.stringify({action: "Set-Session"})

    const response = await handler(event, context)

    expect(response).toEqual({
      "message": "A system error has occurred"
    })
  })

  it("should return error when username is missing", async () => {
    event.requestContext.authorizer = {
      sessionId: "sessionid123"
    }
    event.body = JSON.stringify({action: "Set-Session"})

    const response = await handler(event, context)

    expect(response).toEqual({
      "message": "A system error has occurred"
    })
  })

  it("should return error when no action is specified", async () => {
    const sessionManagementItem = {
      username: "test-user",
      sessionId: "sessionid123",
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      userDetails: {family_name: "Test", given_name: "User"}
    }

    mockTryGetTokenMapping.mockImplementation(() => {
      return sessionManagementItem
    })

    event.requestContext.authorizer = {
      username: "test-user",
      sessionId: "sessionid123"
    }

    event.body = JSON.stringify({}) // No action specified

    const response = await handler(event, context)

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 500)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "No action specified")
  })

  it("should return 401 when session ID doesn't match", async () => {
    const sessionManagementItem = {
      username: "test-user",
      sessionId: "different-session-id",
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      userDetails: {family_name: "Test", given_name: "User"}
    }

    mockTryGetTokenMapping.mockImplementation(() => {
      return sessionManagementItem
    })

    event.requestContext.authorizer = {
      username: "test-user",
      sessionId: "sessionid123"
    }

    event.body = JSON.stringify({action: "Set-Session"})

    const response = await handler(event, context)

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 401)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "Session expired or invalid. Please log in again.")
    expect(body).toHaveProperty("restartLogin", true)
  })

  it("should return 401 when no session management item found", async () => {
    mockTryGetTokenMapping.mockImplementation(() => {
      return undefined // No session management item found
    })

    event.requestContext.authorizer = {
      username: "test-user",
      sessionId: "sessionid123"
    }

    event.body = JSON.stringify({action: "Set-Session"})

    const response = await handler(event, context)

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 401)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "Session expired or invalid. Please log in again.")
    expect(body).toHaveProperty("restartLogin", true)
  })

  it("should handle database errors gracefully", async () => {
    mockTryGetTokenMapping.mockImplementation(() => {
      throw new Error("Database connection failed")
    })

    event.requestContext.authorizer = {
      username: "test-user",
      sessionId: "sessionid123"
    }

    event.body = JSON.stringify({action: "Set-Session"})

    const response = await handler(event, context)

    expect(response).toEqual({
      "message": "A system error has occurred"
    })
  })

  it("should handle insertTokenMapping errors", async () => {
    const sessionManagementItem = {
      username: "test-user",
      sessionId: "sessionid123",
      rolesWithAccess: [{role_id: "123", org_code: "XYZ", role_name: "TestRole"}],
      rolesWithoutAccess: [],
      userDetails: {family_name: "Test", given_name: "User"}
    }

    mockTryGetTokenMapping.mockImplementation(() => {
      return sessionManagementItem
    })

    mockInsertTokenMapping.mockImplementation(() => {
      throw new Error("Insert failed")
    })

    event.requestContext.authorizer = {
      username: "test-user",
      sessionId: "sessionid123"
    }

    event.body = JSON.stringify({action: "Set-Session"})

    const response = await handler(event, context)

    expect(response).toEqual({
      "message": "A system error has occurred"
    })
  })

  it("should handle deleteTokenMapping errors", async () => {
    const sessionManagementItem = {
      username: "test-user",
      sessionId: "sessionid123",
      rolesWithAccess: [{role_id: "123", org_code: "XYZ", role_name: "TestRole"}],
      rolesWithoutAccess: [],
      userDetails: {family_name: "Test", given_name: "User"}
    }

    mockTryGetTokenMapping.mockImplementation(() => {
      return sessionManagementItem
    })

    mockDeleteTokenMapping.mockImplementation(() => {
      throw new Error("Delete failed")
    })

    event.requestContext.authorizer = {
      username: "test-user",
      sessionId: "sessionid123"
    }

    event.body = JSON.stringify({action: "Set-Session"})

    const response = await handler(event, context)

    expect(response).toEqual({
      "message": "A system error has occurred"
    })
  })

  it("should handle body parsing with null body", async () => {
    const sessionManagementItem = {
      username: "test-user",
      sessionId: "sessionid123",
      rolesWithAccess: [],
      rolesWithoutAccess: [],
      userDetails: {family_name: "Test", given_name: "User"}
    }

    mockTryGetTokenMapping.mockImplementation(() => {
      return sessionManagementItem
    })

    event.requestContext.authorizer = {
      username: "test-user",
      sessionId: "sessionid123"
    }

    event.body = null

    const response = await handler(event, context)

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 500)

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "No action specified")
  })
})
