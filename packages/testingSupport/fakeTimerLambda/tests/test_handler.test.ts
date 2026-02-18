/* eslint-disable  @typescript-eslint/no-explicit-any */
import {jest} from "@jest/globals"
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"

// Set env vars before importing handler
process.env.TokenMappingTableName = "TokenMappingTable"
process.env.SessionManagementTableName = "SessionManagementTable"

// Mock dynamo functions for handler integration tests
const mockDeleteRecordAllowFailures = jest.fn() as any
const mockGetTokenMapping = jest.fn() as any
const mockUpdateTokenMapping = jest.fn() as any

jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    deleteRecordAllowFailures: mockDeleteRecordAllowFailures,
    getTokenMapping: mockGetTokenMapping,
    updateTokenMapping: mockUpdateTokenMapping
  }
})

// Define API Gateway types
interface APIGatewayProxyEvent {
  body: string | null
  [key: string]: any
}

interface APIGatewayProxyResult {
  statusCode: number
  body: string
  [key: string]: any
}

// Dynamically import the handler AFTER mocks and env setup
const {handler} = await import("../src/handler")

describe("Lambda Handler Integration Tests - Timeout Version", () => {
  let context: typeof mockContext | undefined = undefined

  beforeEach(() => {
    jest.clearAllMocks()
    context = {...mockContext}

    // Reset mocks to default behavior
    mockGetTokenMapping.mockResolvedValue({
      username: "test-user",
      lastActivityTime: Date.now()
    })
    mockUpdateTokenMapping.mockResolvedValue(undefined)
    mockDeleteRecordAllowFailures.mockResolvedValue(undefined)
  })

  const buildEvent = (body: unknown): APIGatewayProxyEvent => ({
    ...mockAPIGatewayProxyEvent,
    body: typeof body === "string" || body === null ? body : JSON.stringify(body)
  })

  describe("successful handler scenarios", () => {
    it("returns 200 when successfully updating lastActivityTime to 13 minutes in past", async (): Promise<void> => {
      mockGetTokenMapping.mockResolvedValue({
        username: "test-user",
        lastActivityTime: Date.now()
      })
      mockUpdateTokenMapping.mockResolvedValue(undefined)

      const event = buildEvent({username: "test-user", request_id: "test-request"})
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.body)).toEqual({})
      expect(mockGetTokenMapping).toHaveBeenCalledWith(
        expect.anything(),
        "TokenMappingTable",
        "test-user",
        expect.anything()
      )
      expect(mockUpdateTokenMapping).toHaveBeenCalledWith(
        expect.anything(),
        "TokenMappingTable",
        expect.objectContaining({
          username: "test-user",
          lastActivityTime: expect.any(Number)
        }),
        expect.anything()
      )
    })

    it("works without request_id parameter", async (): Promise<void> => {
      mockGetTokenMapping.mockResolvedValue({
        username: "test-user",
        lastActivityTime: Date.now()
      })
      mockUpdateTokenMapping.mockResolvedValue(undefined)

      const event = buildEvent({username: "test-user"})
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.body)).toEqual({})
    })

    it("returns 500 when getTokenMapping fails for unknown user", async (): Promise<void> => {
      mockGetTokenMapping.mockRejectedValue(new Error("Error retrieving data from TokenMappingTable "
         + "for user: unknown-user"))

      const event = buildEvent({username: "unknown-user"})
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(500)
      expect(JSON.parse(response.body)).toEqual({message: "Error updating session timeout"})
      expect(mockUpdateTokenMapping).not.toHaveBeenCalled()
    })
  })

  describe("validation error scenarios", () => {
    it("returns 400 when request body is missing username", async (): Promise<void> => {
      const event = buildEvent({notUsername: "test-user"})
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toEqual({message: "Invalid request body"})
      expect(mockGetTokenMapping).not.toHaveBeenCalled()
      expect(mockUpdateTokenMapping).not.toHaveBeenCalled()
    })

    it("returns 400 when body is missing", async (): Promise<void> => {
      const event = buildEvent(null)
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toEqual({message: "Invalid request body"})
      expect(mockGetTokenMapping).not.toHaveBeenCalled()
      expect(mockUpdateTokenMapping).not.toHaveBeenCalled()
    })

    it("returns 400 when username is empty string", async (): Promise<void> => {
      const event = buildEvent({username: ""})
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toEqual({message: "Invalid request body"})
      expect(mockGetTokenMapping).not.toHaveBeenCalled()
      expect(mockUpdateTokenMapping).not.toHaveBeenCalled()
    })

    it("accepts username that is not a string (handler doesn't type-check)", async (): Promise<void> => {
      mockGetTokenMapping.mockResolvedValue({
        username: "123",
        lastActivityTime: Date.now()
      })
      mockUpdateTokenMapping.mockResolvedValue(undefined)

      const event = buildEvent({username: 123})
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.body)).toEqual({})
      expect(mockGetTokenMapping).toHaveBeenCalled()
      expect(mockUpdateTokenMapping).toHaveBeenCalled()
    })
  })
})
