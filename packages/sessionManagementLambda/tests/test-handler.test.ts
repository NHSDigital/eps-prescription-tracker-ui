import {
  jest,
  expect,
  describe,
  it
} from "@jest/globals"
import {Logger} from "@aws-lambda-powertools/logger"
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"
import {TokenMappingItem} from "@cpt-ui-common/dynamoFunctions"

const mockGetTokenMapping = jest.fn().mockName("mockGetTokenMapping")
const mockUpdateTokenMapping = jest.fn().mockName("mockUpdateTokenMapping")
const mockCheckTokenMappingForUser = jest.fn().mockName("mockCheckTokenMappingForUser")
const mockDeleteSessionManagementRecord = jest.fn().mockName("mockDeleteSessionManagementRecord")

const mockInitializeOidcConfig = jest.fn().mockName("mockInitializeOidcConfig")
const mockFetchUserInfo = jest.fn().mockName("mockFetchUserInfo")
mockInitializeOidcConfig.mockImplementation(() => ({cis2OidcConfig: {}, mockOidcConfig: {}}))

jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    getTokenMapping: mockGetTokenMapping,
    updateTokenMapping: mockUpdateTokenMapping,
    checkTokenMappingForUser: mockCheckTokenMappingForUser,
    deleteSessionManagementRecord: mockDeleteSessionManagementRecord
  }
})
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  return {
    authParametersFromEnv: () => ({
      tokenMappingTableName: "TokenMappingTable",
      sessionManagementTableName: "SessionManagementTable"
    }),
    authenticationMiddleware: () => ({before: () => {}}),
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

    mockCheckTokenMappingForUser.mockImplementation(() => {
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
    expect(mockCheckTokenMappingForUser).toHaveBeenCalled()
    expect(mockUpdateTokenMapping).toHaveBeenCalledWith(
      expect.anything(),
      "TokenMappingTable",
      sessionManagementItem,
      expect.anything()
    )
    expect(mockDeleteSessionManagementRecord).toHaveBeenCalledWith(
      expect.anything(),
      "SessionManagementTable",
      "test-user",
      "sessionid123",
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

    mockCheckTokenMappingForUser.mockImplementation(() => {
      return sessionManagementItem
    })

    event.requestContext.authorizer = {
      username: "test-user",
      sessionId: "sessionid123"
    }

    event.body = JSON.stringify({})

    const response = await handler(event, context)

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 500)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toEqual({
      "message": "No action specified"
    })
    expect(mockCheckTokenMappingForUser).toHaveBeenCalled()
  })

  it("should error if no username supplied", async () => {
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

    mockCheckTokenMappingForUser.mockImplementation(() => {
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
    expect(mockCheckTokenMappingForUser).not.toHaveBeenCalled()
  })

  it("should error if no username supplied", async () => {
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

    mockCheckTokenMappingForUser.mockImplementation(() => {
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
    expect(mockCheckTokenMappingForUser).not.toHaveBeenCalled()
  })

  it("should error if payload body is not json", async () => {
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

    mockCheckTokenMappingForUser.mockImplementation(() => {
      return sessionManagementItem
    })

    const loggerSpy = jest.spyOn(Logger.prototype, "error")

    event.requestContext.authorizer = {
      username: "username",
      sessionId: "12345"
    }

    event.body = btoa("I'm not JSON")

    const response = await handler(event, context)
    expect(response).toEqual({
      "message": "A system error has occurred"
    })
    expect(mockCheckTokenMappingForUser).not.toHaveBeenCalled()
    expect(loggerSpy).toHaveBeenCalledWith("Failed to parse request body", expect.anything())
  })

  it("should error if sessionId doesn't match an item in the database", async () => {
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

    mockCheckTokenMappingForUser.mockImplementation(() => {
      return sessionManagementItem
    })
    const loggerSpy = jest.spyOn(Logger.prototype, "error")

    event.requestContext.authorizer = {
      username: "username",
      sessionId: "12345"
    }

    event.body = JSON.stringify({})

    const response = await handler(event, context)

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 500)
    expect(response).toHaveProperty("body")
    const body = JSON.parse(response.body)
    expect(body).toEqual({
      "message": "A system error has occurred"
    })
    expect(mockCheckTokenMappingForUser).toHaveBeenCalled()
    expect(loggerSpy).toHaveBeenCalledWith("Request doesn't match an action case, or session ID doesn't match an item in sessionManagement table.") // eslint-disable-line max-len
  })
})
