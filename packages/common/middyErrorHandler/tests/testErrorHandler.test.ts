/* eslint-disable @typescript-eslint/no-explicit-any */
import {MiddyErrorHandler} from "../src/errorHandler"
import middy from "@middy/core"
import {expect, jest} from "@jest/globals"
import {mockContext} from "@cpt-ui-common/testing"

const mockEvent = {
  foo: "bar"
}

test("Middleware logs all error details", async () => {
  type ErrorLogger = (error: any, message: string) => void
  const mockErrorLogger: jest.MockedFunction<ErrorLogger> = jest.fn()
  const mockLogger = {
    error: mockErrorLogger
  }
  const errorResponse = {foo: "bar"}

  const middyErrorHandler = new MiddyErrorHandler(errorResponse)

  const handler = middy(() => {
    throw new Error("error running lambda")
  })

  handler.use(middyErrorHandler.errorHandler({logger: mockLogger}))

  await handler({}, mockContext)

  expect(mockErrorLogger).toHaveBeenCalledTimes(1)

  const [errorObject, errorMessage] = mockErrorLogger.mock.calls[mockErrorLogger.mock.calls.length - 1]
  expect(errorMessage).toBe("Error: error running lambda")
  expect(errorObject.error.name).toBe("Error")
  expect(errorObject.error.message).toBe("error running lambda")
  expect(errorObject.error.stack).not.toBeNull()
})

test("Middleware returns specific error message on failure", async () => {
  const mockLogger = {
    error: jest.fn(() => {})
  }
  const errorResponse = {
    statusCode: 500,
    body: JSON.stringify({message: "A system error has occured"}),
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    }
  }

  const middyErrorHandler = new MiddyErrorHandler(errorResponse)

  const handler = middy(() => {
    throw new Error("error running lambda")
  })

  handler.use(middyErrorHandler.errorHandler({logger: mockLogger}))

  const response: any = await handler(mockEvent, mockContext)
  expect(response.statusCode).toBe(500)
  expect(JSON.parse(response.body)).toMatchObject({
    message: "A system error has occured"
  })
})
