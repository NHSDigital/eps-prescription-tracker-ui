import {jest} from "@jest/globals"

// Set environment variables before importing the handler.
process.env.IDP_AUTHORIZE_PATH = "https://example.com/authorize"

// Import the handler after setting the env variables and mocks.
import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"
const {handler} = await import("../src/authorize")

describe("Lambda Handler", () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  test("should redirect to CIS2 with correct parameters", async () => {
    const event = {
      ...mockAPIGatewayProxyEvent,
      queryStringParameters: {
        ...mockAPIGatewayProxyEvent.queryStringParameters,
        state: "test-state",
        response_type: "code"
      }
    }

    const result = await handler(event, mockContext)
    expect(result.statusCode).toBe(302)
    expect(result.headers).toHaveProperty("Location")

    // Parse the redirect URL and validate parameters.
    const locationUrl = new URL(result.headers?.Location as string)
    expect(locationUrl.origin).toBe("https://example.com")
    expect(locationUrl.pathname).toBe("/authorize")
    const params = locationUrl.searchParams

    expect(params.get("response_type")).toBe("code")
    expect(params.get("state")).toBe("test-state")
    expect(params.get("prompt")).toBe("login")
  })
})
