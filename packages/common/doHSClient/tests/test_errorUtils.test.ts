import {jest} from "@jest/globals"

import {handleAxiosError} from "../src/errorUtils"
import {AxiosError, AxiosRequestHeaders} from "axios"
import {Logger} from "@aws-lambda-powertools/logger"

describe("handleAxiosError", () => {
  let logger: Logger
  let errorSpy

  beforeEach(() => {
    logger = new Logger()
    errorSpy = jest.spyOn(logger, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it("logs detailed error info when error is an AxiosError", () => {
    const axiosError = new Error("Axios error occurred") as AxiosError
    axiosError.response = {
      status: 404,
      statusText: "Not Found",
      data: "Not Found",
      headers: {},
      config: {
        headers: undefined
      }
    }
    axiosError.isAxiosError = true
    axiosError.config = {
      url: "http://example.com",
      method: "get",
      headers: {apikey: "dummy"} as unknown as AxiosRequestHeaders,
      data: null
    }

    const contextMessage = "Test AxiosError"
    handleAxiosError(axiosError, contextMessage, logger)

    expect(errorSpy).toHaveBeenCalledWith(
      contextMessage,
      expect.objectContaining({
        message: "Axios error occurred",
        status: 404,
        responseData: "Not Found",
        requestConfig: expect.objectContaining({
          url: "http://example.com",
          method: "get",
          headers: {apikey: "dummy"},
          data: null
        })
      })
    )
  })

  it("logs unexpected error for non-Axios errors", () => {
    const genericError = new Error("Generic error")
    const contextMessage = "This context should not be used"
    handleAxiosError(genericError as AxiosError, contextMessage, logger)

    expect(errorSpy).toHaveBeenCalledWith("Unexpected error during Axios request", {error: genericError})
  })
})
