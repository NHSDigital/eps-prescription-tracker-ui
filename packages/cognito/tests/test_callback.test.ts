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
const {handler} = await import("../src/callback")

describe("IDP Response Lambda Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("should redirect to Cognito with correct parameters", async () => {
    // Prepare an event with valid query parameters.
    const event: APIGatewayProxyEvent = {
      ...mockAPIGatewayProxyEvent,
      queryStringParameters: {
        state: "hashedStateValue",
        code: "testCode",
        session_state: "testSessionState"
      }
    }

    // Simulate the state item returned from DynamoDB.
    const stateItem = {
      State: "hashedStateValue",
      CognitoState: "originalStateValue",
      CodeVerifier: "dummy",
      Ttl: 123456,
      UseMock: true
    }

    // First call for GetCommand returns the state item.
    mockSend.mockImplementationOnce(() => Promise.resolve({Item: stateItem}))
    // Second call for DeleteCommand returns an empty object.
    mockSend.mockImplementationOnce(() => Promise.resolve({}))

    const result = await handler(event, mockContext)
    expect(result.statusCode).toBe(302)
    expect(result.headers).toHaveProperty("Location")

    // Verify the redirect URL.
    const redirectUrl = new URL(result.headers?.Location as string)
    const params = redirectUrl.searchParams
    expect(params.get("state")).toBe("originalStateValue")
    expect(params.get("session_state")).toBe("testSessionState")
    expect(params.get("code")).toBe("testCode")
    expect(redirectUrl.hostname).toBe(process.env.COGNITO_DOMAIN)
    expect(redirectUrl.pathname).toBe("/oauth2/idpresponse")

    // Ensure DynamoDB commands were executed (one for Get, one for Delete).
    expect(mockSend).toHaveBeenCalledTimes(2)
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

  test("should throw error if state not found in DynamoDB", async () => {
    const event: APIGatewayProxyEvent = {
      ...mockAPIGatewayProxyEvent,
      queryStringParameters: {
        state: "nonexistentState",
        code: "testCode",
        session_state: "testSessionState"
      }
    }

    // For GetCommand, simulate that no item is found.
    mockSend.mockImplementationOnce(() => Promise.resolve({}))
    // Simulate DeleteCommand call (even if not used).
    mockSend.mockImplementationOnce(() => Promise.resolve({}))

    await expect(handler(event, mockContext)).resolves.toStrictEqual(
      {"message": "A system error has occurred"}
    )
  })
})
