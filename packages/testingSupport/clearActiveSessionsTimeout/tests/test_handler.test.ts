/* eslint-disable  @typescript-eslint/no-explicit-any */
import {jest} from "@jest/globals"
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"

// Set env vars before importing handler
process.env.TokenMappingTableName = "TokenMappingTable"
process.env.SessionManagementTableName = "SessionManagementTable"

// Mock deleteRecordAllowFailures for handler integration tests
const mockDeleteRecordAllowFailures = jest.fn() as any

jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    deleteRecordAllowFailures: mockDeleteRecordAllowFailures
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
  })

  const buildEvent = (body: unknown): APIGatewayProxyEvent => ({
    ...mockAPIGatewayProxyEvent,
    body: typeof body === "string" || body === null ? body : JSON.stringify(body)
  })

  describe("successful handler scenarios", () => {
    it("returns 401 with timeout context when both records are deleted successfully", async (): Promise<void> => {
      mockDeleteRecordAllowFailures.mockResolvedValue(undefined)

      const event = buildEvent({username: "test-user", request_id: "test-request"})
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(401)
      expect(JSON.parse(response.body)).toEqual({
        message: "Session expired or invalid. Please log in again.",
        restartLogin: true,
        invalidSessionCause: "Timeout"
      })
      expect(mockDeleteRecordAllowFailures).toHaveBeenCalledTimes(2)
      expect(mockDeleteRecordAllowFailures).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        "TokenMappingTable",
        "test-user",
        expect.anything()
      )
      expect(mockDeleteRecordAllowFailures).toHaveBeenLastCalledWith(
        expect.anything(),
        "SessionManagementTable",
        "test-user",
        expect.anything()
      )
    })

    it("works without request_id parameter", async (): Promise<void> => {
      mockDeleteRecordAllowFailures.mockResolvedValue(undefined)

      const event = buildEvent({username: "test-user"})
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(401)
      expect(JSON.parse(response.body)).toEqual({
        message: "Session expired or invalid. Please log in again.",
        restartLogin: true,
        invalidSessionCause: "Timeout"
      })
    })
  })

  describe("validation error scenarios", () => {
    it("returns 400 when request body is missing username", async (): Promise<void> => {
      const event = buildEvent({notUsername: "test-user"})
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toEqual({message: "Invalid request body"})
      expect(mockDeleteRecordAllowFailures).not.toHaveBeenCalled()
    })

    it("returns 400 when body is missing", async (): Promise<void> => {
      const event = buildEvent(null)
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toEqual({message: "Invalid request body"})
      expect(mockDeleteRecordAllowFailures).not.toHaveBeenCalled()
    })

    it("returns 400 when username is empty string", async (): Promise<void> => {
      const event = buildEvent({username: ""})
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toEqual({message: "Invalid request body"})
      expect(mockDeleteRecordAllowFailures).not.toHaveBeenCalled()
    })

    it("accepts username that is not a string (handler doesn't type-check)", async (): Promise<void> => {
      mockDeleteRecordAllowFailures.mockResolvedValue(undefined)

      const event = buildEvent({username: 123})
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(401)
      expect(JSON.parse(response.body)).toEqual({
        message: "Session expired or invalid. Please log in again.",
        restartLogin: true,
        invalidSessionCause: "Timeout"
      })
      expect(mockDeleteRecordAllowFailures).toHaveBeenCalledTimes(2)
    })
  })
})
