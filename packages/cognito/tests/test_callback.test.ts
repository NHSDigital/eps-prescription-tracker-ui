import {APIGatewayProxyEvent} from "aws-lambda"
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest"

// Import the handler after setting env variables and mocks.
import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"
import {handler} from "../src/callback"

describe("callback handler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should redirect to Cognito with correct parameters", async () => {
    // Prepare an event with valid query parameters.
    const event: APIGatewayProxyEvent = {
      ...mockAPIGatewayProxyEvent,
      queryStringParameters: {
        state: "testState",
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
    expect(params.get("state")).toBe("testState")
    expect(params.get("session_state")).toBe("testSessionState")
    expect(params.get("code")).toBe("testCode")
    expect(redirectUrl.hostname).toBe(process.env.COGNITO_DOMAIN)
    expect(redirectUrl.pathname).toBe("/oauth2/idpresponse")
  })

  it("should throw error if missing required query parameters", async () => {
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
})
