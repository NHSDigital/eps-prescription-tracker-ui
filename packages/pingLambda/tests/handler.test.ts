import {jest} from "@jest/globals"

import {APIGatewayProxyEvent} from "aws-lambda"
import {handler as originalHandler} from "../src/handler"
import {Logger} from "@aws-lambda-powertools/logger"

import {mockAPIGatewayProxyEvent} from "@cpt-ui-common/testing"

describe("pingPong lambda handler", () => {
  let event: APIGatewayProxyEvent

  beforeEach(() => {
    // Create a fake API Gateway event
    event = {...mockAPIGatewayProxyEvent}
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("returns 200 and 'PONG' in the response", async () => {
    const response = await originalHandler(event, {})
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe("PONG")
  })

  it("logs the invocation", async () => {
    // Spy on logger methods. (The lambda creates its own logger instance,
    // so we spy on the Logger prototype methods.)
    const appendSpy = jest.spyOn(Logger.prototype, "appendKeys").mockImplementation(() => {})
    const infoSpy = jest.spyOn(Logger.prototype, "info").mockImplementation(() => {})

    await originalHandler(event, {})

    // Check that the handler appended the "apigw-request-id" key to the logger.
    expect(appendSpy).toHaveBeenLastCalledWith({"apigw-request-id": event.requestContext?.requestId})

    // And that it logged the "PING handler invoked" message.
    const loggedInvocation = infoSpy.mock.calls.some(call => {
      const msg = call[0]
      return typeof msg === "string" && msg.includes("PING handler invoked")
    })
    expect(loggedInvocation).toBe(true)
  })

  it("handles errors using the MiddyErrorHandler", async () => {
    const simulatedErrorMessage = "Simulated error"
    // Force an error by making appendKeys throw an error.
    jest
      .spyOn(Logger.prototype, "appendKeys")
      .mockImplementation(() => {
        throw new Error(simulatedErrorMessage)
      })

    // Call the handler. The error thrown in appendKeys should be caught by the error handler middleware.
    const response = await originalHandler(event, {})

    // The MiddyErrorHandler is set up with an error response body:
    // { message: "A system error has occurred" }
    expect(response).toEqual({
      message: "A system error has occurred"
    })
  })
})
