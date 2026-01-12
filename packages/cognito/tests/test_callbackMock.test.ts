import {APIGatewayProxyEvent} from "aws-lambda"
import {
  beforeEach,
  describe,
  expect,
  it,
  test,
  vi
} from "vitest"

// Import the handler after setting env variables and mocks.
import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"
import {Logger} from "@aws-lambda-powertools/logger"
const {handler} = await import("../src/callbackMock")

describe("Callback mock handler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    const loggerWarnSpy = vi.spyOn(Logger.prototype, "warn")
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
    expect(params.get("state")).toBe("non_json_state")
    expect(params.get("session_state")).toBe("testSessionState")
    expect(redirectUrl.hostname).toBe("cognito.example.com")
    expect(redirectUrl.pathname).toBe("/oauth2/idpresponse")
    expect(loggerWarnSpy).toHaveBeenCalled()
  })
})
