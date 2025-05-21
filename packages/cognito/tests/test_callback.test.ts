import {jest} from "@jest/globals"

import {APIGatewayProxyEvent} from "aws-lambda"

// Set required environment variables before importing the handler.
process.env.StateMappingTableName = "testStateMappingTable"
process.env.COGNITO_DOMAIN = "cognito.example.com"

const mockDeleteStateMapping = jest.fn()
const mockGetStateMapping = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    deleteStateMapping: mockDeleteStateMapping,
    getStateMapping: mockGetStateMapping
  }
})

// Import the handler after setting env variables and mocks.
import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"
const {handler} = await import("../src/callback")

describe("callback handler", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should redirect to Cognito with correct parameters", async () => {
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
    mockGetStateMapping.mockImplementationOnce(() => Promise.resolve(stateItem))

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
    expect(mockGetStateMapping).toHaveBeenCalledTimes(1)
    expect(mockDeleteStateMapping).toHaveBeenCalledTimes(1)
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

  it("should throw error if state not found in DynamoDB", async () => {
    const event: APIGatewayProxyEvent = {
      ...mockAPIGatewayProxyEvent,
      queryStringParameters: {
        state: "nonexistentState",
        code: "testCode",
        session_state: "testSessionState"
      }
    }

    // For GetCommand, simulate that no item is found.
    mockGetStateMapping.mockImplementationOnce(() => Promise.reject(new Error("there was a problem")))

    await expect(handler(event, mockContext)).resolves.toStrictEqual(
      {"message": "A system error has occurred"}
    )
  })
})
