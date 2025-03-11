import {jest} from "@jest/globals"

import {createHash} from "crypto"

// Set environment variables before importing the handler.
process.env.IDP_AUTHORIZE_PATH = "https://example.com/authorize"
process.env.OIDC_CLIENT_ID = "cis2Client123"
process.env.useMock = "true"
process.env.COGNITO_CLIENT_ID = "userPoolClient123"
process.env.FULL_CLOUDFRONT_DOMAIN = "d111111abcdef8.cloudfront.net"
process.env.StateMappingTableName = "stateMappingTest"

// Create a mock for the DynamoDBDocumentClient send method.
const mockSend = jest.fn().mockImplementation(async () => Promise.resolve({}))

// Mock the @aws-sdk/lib-dynamodb module so that calls to DynamoDB are intercepted.
jest.unstable_mockModule("@aws-sdk/lib-dynamodb", () => {
  return {
    DynamoDBDocumentClient: {
      from: () => ({
        send: mockSend
      })
    },
    PutCommand: jest.fn()
  }
})

// Import the handler after setting the env variables and mocks.
import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"
const {handler} = await import("../src/index")

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
    const params = locationUrl.searchParams

    expect(params.get("response_type")).toBe("code")
    expect(params.get("scope")).toBe(
      "openid profile email nhsperson nationalrbacaccess associatedorgs"
    )
    expect(params.get("client_id")).toBe("cis2Client123")

    // Verify that the state parameter is hashed correctly.
    const expectedHash = createHash("sha256")
      .update("test-state")
      .digest("hex")
    expect(params.get("state")).toBe(expectedHash)

    expect(params.get("redirect_uri")).toBe(
      `https://${process.env.FULL_CLOUDFRONT_DOMAIN}/oauth2/callback`
    )
    expect(params.get("prompt")).toBe("login")

    // Ensure the DynamoDB put command was called.
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  test("should throw error if missing state parameter", async () => {
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

  test("should throw error if client_id does not match", async () => {
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
