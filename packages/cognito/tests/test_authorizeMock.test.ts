import {jest} from "@jest/globals"

import {createHash} from "crypto"

// Set environment variables before importing the handler.
process.env.IDP_AUTHORIZE_PATH = "https://example.com/authorize"
process.env.OIDC_CLIENT_ID = "cis2Client123"
process.env.useMock = "true"
process.env.COGNITO_CLIENT_ID = "userPoolClient123"
process.env.FULL_CLOUDFRONT_DOMAIN = "d111111abcdef8.cloudfront.net"
process.env.StateMappingTableName = "stateMappingTest"

const mockInsertStateMapping = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    insertStateMapping: mockInsertStateMapping
  }
})

// Import the handler after setting the env variables and mocks.
import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"
const {handler} = await import("../src/authorizeMock")

describe("authorize mock handler", () => {
  beforeEach(() => {
    jest.restoreAllMocks()
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

    // Verify that the state parameter is hashed correctly.
    const expectedHash = createHash("sha256")
      .update("test-state")
      .digest("hex")
    const expectedStateJson = {
      isPullRequest: true,
      redirectUri: `https://${process.env.FULL_CLOUDFRONT_DOMAIN}/oauth2/mock-callback`,
      originalState: expectedHash
    }
    const expectedState = Buffer.from(JSON.stringify(expectedStateJson)).toString("base64")

    expect(params.get("state")).toBe(expectedState)

    expect(params.get("redirect_uri")).toBe(
      "https://cpt-ui.dev.eps.national.nhs.uk/oauth2/mock-callback"
    )
    expect(params.get("prompt")).toBe(null)

    // Ensure the DynamoDB put command was called.
    expect(mockInsertStateMapping).toHaveBeenCalledTimes(1)
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
