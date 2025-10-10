/* eslint-disable @typescript-eslint/no-explicit-any */
import {jest} from "@jest/globals"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectCorrelationLoggerMiddleware} from "../src"

describe("injectCorrelationLoggerMiddleware", () => {
  let logger: Logger
  beforeEach(() => {
    jest.clearAllMocks()
    logger = new Logger({serviceName: "test"})
    logger.info = jest.fn()
    logger.debug = jest.fn()
    logger.error = jest.fn()
    logger.appendKeys = jest.fn()
  }
  )
  test("it should add a correlation id header if it does not exist", () => {
    const middleware = injectCorrelationLoggerMiddleware(logger)
    const mockRequest: any = {
      event: {
        headers: {}
      }}
    middleware.before(mockRequest)
    expect(mockRequest.event.headers["x-correlation-id"]).toBeDefined()
  })

  test("it should add the headers if they exist", () => {
    const middleware = injectCorrelationLoggerMiddleware(logger)
    const mockRequest: any = {
      event: {
        headers: {
          "x-request-id": "test-request-id",
          "x-session-id": "test-session-id",
          "x-rum-session-id": "test-rum-session-id"
        }
      }
    }
    middleware.before(mockRequest)
    expect(logger.appendKeys).toHaveBeenCalledWith(expect.objectContaining({
      "x-request-id": "test-request-id",
      "x-session-id": "test-session-id",
      "x-rum-session-id": "test-rum-session-id",
      "x-correlation-id": expect.any(String)
    }))
  })

})
