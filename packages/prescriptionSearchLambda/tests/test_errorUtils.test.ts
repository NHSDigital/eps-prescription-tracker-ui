import {jest} from "@jest/globals"
import {handleErrorResponse} from "../src/utils/errorUtils"

jest.mock("@aws-lambda-powertools/logger", () => {
  return {
    Logger: jest.fn().mockImplementation(() => {
      const logger = {
        error: jest.fn(),
        debug: jest.fn(),
        info: jest.fn()
      }
      return logger
    })
  }
})

describe("errorUtils", () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("handleErrorResponse - returns formatted response", () => {
    const result = handleErrorResponse(new Error("Test error"), "Default message")

    expect(result).toEqual({
      statusCode: 500,
      body: JSON.stringify({
        message: "Default message",
        details: "Test error"
      })
    })
  })
})
