import {jest} from "@jest/globals"

import {APIGatewayProxyEvent} from "aws-lambda"

// Set required environment variables before importing the handler.
process.env.StateMappingTableName = "testStateMappingTable"
process.env.COGNITO_DOMAIN = "cognito.example.com"

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
    DeleteCommand: jest.fn(),
    GetCommand: jest.fn()
  }
})

// Import the handler after setting env variables and mocks.
import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"
const {handler} = await import("../src/callbackMock")

describe("Callback Response Lambda Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("should redirect to pull request with correct parameters", async () => {
    // Prepare an event with valid query parameters.
    const stateObject = {
      isPullRequest: true,
      redirectUri: "https://foo/bar"
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
    expect(params.get("state")).toBe(state)
    expect(params.get("session_state")).toBe("testSessionState")
    expect(params.get("code")).toBe("testCode")
    expect(redirectUrl.hostname).toBe("foo")
    expect(redirectUrl.pathname).toBe("/bar")
  })

})
