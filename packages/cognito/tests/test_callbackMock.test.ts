import {jest} from "@jest/globals"
import {APIGatewayProxyEvent} from "aws-lambda"

// Set required environment variables before importing the handler.
process.env.StateMappingTableName = "testStateMappingTable"
process.env.COGNITO_DOMAIN = "cognito.example.com"

const mockDeleteStateMapping = jest.fn()
const mockGetStateMapping = jest.fn()
const mockInsertSessionState = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    deleteStateMapping: mockDeleteStateMapping,
    getStateMapping: mockGetStateMapping,
    insertSessionState: mockInsertSessionState
  }
})

// Import the handler after setting env variables and mocks.
import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"
import {createHash} from "crypto"
import {Logger} from "@aws-lambda-powertools/logger"
const {handler} = await import("../src/callbackMock")

describe("Callback mock handler", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should redirect to pull request with correct parameters", async () => {
    // Prepare an event with valid query parameters.
    const stateObject = {
      isPullRequest: true,
      redirectUri: "https://foo/bar",
      originalState: "foo"
    }
    const stateString = JSON.stringify(stateObject)
    const state = Buffer.from(stateString).toString("base64")

    const event: APIGatewayProxyEvent = {
      ...mockAPIGatewayProxyEvent,
      queryStringParameters: {
        state: state,
        code: "testCode",
        session_state: "testSessionState"
      }
    }

    const result = await handler(event, mockContext)
    expect(result.statusCode).toBe(302)
    expect(result.headers).toHaveProperty("Location")

    // Verify the redirect URL.
    const redirectUrl = new URL(result.headers?.Location as string)
    const params = redirectUrl.searchParams
    expect(params.get("state")).toBe("foo")
    expect(params.get("session_state")).toBe("testSessionState")
    expect(params.get("code")).toBe("testCode")
    expect(redirectUrl.hostname).toBe("foo")
    expect(redirectUrl.pathname).toBe("/bar")
  })

  test("should throw error if missing required query parameters", async () => {
    const event: APIGatewayProxyEvent = {
      ...mockAPIGatewayProxyEvent,
      queryStringParameters: {
        code: "testCode",
        session_state: "testSessionState"
        // Missing the 'state' parameter.
      }
    }

    await expect(handler(event, mockContext)).resolves.toStrictEqual(
      {"message": "A system error has occurred"}
    )
  })

  test("should handle state not being a JSON object", async () => {
    const state = "non_json_state"
    const stateItem = {
      State: "hashedStateValue",
      CognitoState: "originalStateValue",
      CodeVerifier: "dummy",
      Ttl: 123456,
      UseMock: true
    }
    mockGetStateMapping.mockImplementationOnce(() => Promise.resolve(stateItem))
    const loggerWarnSpy = jest.spyOn(Logger.prototype, "warn")
    const event: APIGatewayProxyEvent = {
      ...mockAPIGatewayProxyEvent,
      queryStringParameters: {
        state: state,
        code: "testCode",
        session_state: "testSessionState"
      }
    }

    const result = await handler(event, mockContext)
    expect(result.statusCode).toBe(302)
    expect(result.headers).toHaveProperty("Location")

    // Verify the redirect URL.
    const redirectUrl = new URL(result.headers?.Location as string)
    const params = redirectUrl.searchParams
    expect(params.get("state")).toBe("originalStateValue")
    const expectedSessionState = createHash("sha256").update(state).digest("hex")
    expect(params.get("session_state")).toBe(expectedSessionState)
    expect(redirectUrl.hostname).toBe("cognito.example.com")
    expect(redirectUrl.pathname).toBe("/oauth2/idpresponse")
    expect(loggerWarnSpy).toHaveBeenCalled()
    expect(mockInsertSessionState).toHaveBeenCalled()
    expect(mockDeleteStateMapping).toHaveBeenCalled()
  })
})
