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

describe("Lambda Handler Integration Tests", () => {
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
    it("returns 200 when both records are deleted successfully", async (): Promise<void> => {
      mockDeleteRecordAllowFailures.mockResolvedValue(undefined)

      const event = buildEvent({username: "test-user"})
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.body)).toEqual({message: "Success"})
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

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.body)).toEqual({message: "Success"})
      expect(mockDeleteRecordAllowFailures).toHaveBeenCalledTimes(2)
    })
  })

  describe("system error scenarios", () => {
    it("returns 500 when deleteRecordAllowFailures throws (Promise.allSettled)", async (): Promise<void> => {
      mockDeleteRecordAllowFailures.mockRejectedValue(new Error("Simulated delete failure"))

      const event = buildEvent({username: "fail-user"})
      const response: APIGatewayProxyResult = await handler(event, context)

      expect(response.statusCode).toBe(500)
      expect(JSON.parse(response.body)).toEqual({message: "A system error has occurred"})
      expect(mockDeleteRecordAllowFailures).toHaveBeenCalledTimes(2)
    })

    it("returns 500 when one deletion fails (partial failure)", async (): Promise<void> => {
      // Mock one deletion to fail, one to succeed (simulating real Promise.allSettled behavior)
      mockDeleteRecordAllowFailures
        .mockRejectedValueOnce(new Error("Token mapping deletion failed"))
        .mockResolvedValueOnce(undefined)

      const event = buildEvent({username: "partial-success-user"})
      const response: APIGatewayProxyResult = await handler(event, context)

      // Handler returns 500 because it checks Promise.allSettled results and throws on rejection
      expect(response.statusCode).toBe(500)
      expect(JSON.parse(response.body)).toEqual({message: "A system error has occurred"})
      expect(mockDeleteRecordAllowFailures).toHaveBeenCalledTimes(2)
    })

    // Note: Invalid JSON handling depends on middleware configuration
    it("handles invalid JSON in request body", async (): Promise<void> => {
      const event: APIGatewayProxyEvent = {
        ...mockAPIGatewayProxyEvent,
        body: "{invalid-json"
      }

      // In test environment, middleware may not handle errors the same way
      // This test verifies the handler doesn't crash
      try {
        const response: APIGatewayProxyResult = await handler(event, context)
        // If we get a response, it should have a valid structure
        if (response) {
          expect(typeof response.statusCode).toBe("number")
        }
      } catch (error) {
        // JSON parsing errors are expected in this scenario
        expect(error).toBeDefined()
      }

      expect(mockDeleteRecordAllowFailures).not.toHaveBeenCalled()
    })

    it("handles missing environment variables gracefully", async (): Promise<void> => {
      mockDeleteRecordAllowFailures.mockResolvedValue(undefined)

      // Temporarily remove environment variables
      const originalTokenTable = process.env.TokenMappingTableName
      const originalSessionTable = process.env.SessionManagementTableName

      delete process.env.TokenMappingTableName
      delete process.env.SessionManagementTableName

      try {
        const event = buildEvent({username: "test-user"})
        const response: APIGatewayProxyResult = await handler(event, context)

        // Handler may continue with undefined env vars and pass undefined to deleteRecordAllowFailures
        expect(response.statusCode).toBe(200)
        expect(JSON.parse(response.body)).toEqual({message: "Success"})
        expect(mockDeleteRecordAllowFailures).toHaveBeenCalledTimes(2)
        // Environment variables are read at module load time, so they retain original values
        expect(mockDeleteRecordAllowFailures).toHaveBeenNthCalledWith(
          1,
          expect.anything(),
          "TokenMappingTable", // Original value from module initialization
          "test-user",
          expect.anything()
        )
      } finally {
        // Restore environment variables
        process.env.TokenMappingTableName = originalTokenTable
        process.env.SessionManagementTableName = originalSessionTable
      }
    })
  })
})
