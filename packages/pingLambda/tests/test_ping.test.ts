import {jest} from "@jest/globals"

import {handler} from "@/handler"
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"
import {Logger} from "@aws-lambda-powertools/logger"

describe("pingPong Lambda Handler", () => {
  afterEach(() => {
    // Restore all mocks to avoid interference between tests
    jest.restoreAllMocks()
  })

  it("should return a 200 response with body 'PONG'", async () => {
    const result = await handler(mockAPIGatewayProxyEvent, mockContext)
    expect(result.statusCode).toBe(200)
    expect(result.body).toBe("PONG")
  })

  it("should return an error response when an error occurs in the handler", async () => {
    // Simulate an error by making logger.info throw an error on its first call.
    jest.spyOn(Logger.prototype, "info").mockImplementationOnce(() => {
      throw new Error("Simulated error")
    })

    const result = await handler(mockAPIGatewayProxyEvent, mockContext)

    // undefined response expected, since middy is handling it
    expect(result.statusCode).toBe(undefined)
    expect(result.body).toBe(undefined)
  })
})
