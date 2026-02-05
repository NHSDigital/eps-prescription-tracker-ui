import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest"

// Set environment variables before importing the handler.
process.env.useMock = "true"

jest.unstable_mockModule("@aws-lambda-powertools/parameters/secrets", () => ({
  getSecret: jest.fn(async () => "apigee_api_key")
}))

// Import the handler after setting the env variables and mocks.
import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"
import {handler} from "../src/authorizeMock"

describe("authorize mock handler", () => {
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
    expect(params.get("client_id")).toBe("apigee_api_key")

    const expectedStateJson = {
      isPullRequest: true,
      redirectUri: `https://${process.env.FULL_CLOUDFRONT_DOMAIN}/oauth2/mock-callback`,
      originalState: "test-state"
    }
    const expectedState = Buffer.from(JSON.stringify(expectedStateJson)).toString("base64")

    expect(params.get("state")).toBe(expectedState)

    expect(params.get("redirect_uri")).toBe(
      "https://cpt-ui.dev.eps.national.nhs.uk/oauth2/mock-callback"
    )
    expect(params.get("prompt")).toBe(null)
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
