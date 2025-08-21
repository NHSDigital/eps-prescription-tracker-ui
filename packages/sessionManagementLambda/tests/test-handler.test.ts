import {
  jest,
  expect,
  describe,
  it
} from "@jest/globals"
import {Logger} from "@aws-lambda-powertools/logger"
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"
import {TokenMappingItem} from "@cpt-ui-common/dynamoFunctions"

const mockTryGetTokenMapping = jest.fn().mockName("mockGetTokenMapping")
const mockUpdateTokenMapping = jest.fn().mockName("mockUpdateTokenMapping")
const mockDeleteTokenMapping = jest.fn().mockName("mockDeleteTokenMapping")

const mockInitializeOidcConfig = jest.fn().mockName("mockInitializeOidcConfig")
const mockFetchUserInfo = jest.fn().mockName("mockFetchUserInfo")
mockInitializeOidcConfig.mockImplementation(() => ({cis2OidcConfig: {}, mockOidcConfig: {}}))

jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    tryGetTokenMapping: mockTryGetTokenMapping,
    updateTokenMapping: mockUpdateTokenMapping,
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
    expect(mockUpdateTokenMapping).toHaveBeenCalledWith(
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
    expect(mockTryGetTokenMapping).not.toHaveBeenCalled()
    expect(loggerSpy).toHaveBeenCalledWith("Failed to parse request body", expect.anything())
  })
})
