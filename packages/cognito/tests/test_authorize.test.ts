import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest"

// Set environment variables before importing the handler.
process.env.useMock = "true"

// Import the handler after setting the env variables and mocks.
import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"
import {handler} from "../src/authorize"

describe("authorize handler", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("should redirect to CIS2 with correct parameters", async () => {
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
    const params = locationUrl.searchParams

    expect(params.get("response_type")).toBe("code")
    expect(params.get("scope")).toBe(
      "openid profile nhsperson nationalrbacaccess associatedorgs"
    )
    expect(params.get("client_id")).toBe("cis2Client123")
    expect(params.get("state")).toBe("test-state")

    expect(params.get("redirect_uri")).toBe(
      `https://${process.env.FULL_CLOUDFRONT_DOMAIN}/oauth2/callback`
    )
    expect(params.get("prompt")).toBe("login")
  })

  it("should throw error if missing state parameter", async () => {
    const event = {
      ...mockAPIGatewayProxyEvent,
      queryStringParameters: {
        client_id: "cis2Client123",
        response_type: "code"
        // state is intentionally missing
      }
    }

    await expect(handler(event, mockContext)).resolves.toStrictEqual(
      {"message": "A system error has occurred"}
    )
  })

  it("should throw error if client_id does not match", async () => {
    const event = {
      ...mockAPIGatewayProxyEvent,
      queryStringParameters: {
        client_id: "wrongClient",
        state: "test-state",
        response_type: "code"
      }
    }

    await expect(handler(event, mockContext)).resolves.toStrictEqual(
      {"message": "A system error has occurred"}
    )
  })
})
