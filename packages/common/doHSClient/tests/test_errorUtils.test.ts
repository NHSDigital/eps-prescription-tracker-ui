import {jest} from "@jest/globals"
import nock from "nock"

import {handleAxiosError} from "../src/errorUtils"
import {AxiosError, AxiosRequestHeaders} from "axios"
import {Logger} from "@aws-lambda-powertools/logger"

const mockLogger: Partial<Logger> = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

describe("handleAxiosError", () => {

  beforeEach(() => {
    jest.clearAllMocks()
    nock.cleanAll()
  })

  afterEach(() => {
    jest.resetAllMocks()
    if (!nock.isDone()) {
      nock.cleanAll()
    }
  })

  it("logs detailed error info when error is an AxiosError", () => {
    const axiosError = new Error("Axios error occurred") as AxiosError
    axiosError.response = {
      status: 404,
      statusText: "Not Found",
      data: "Not Found",
      headers: {},
      config: {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        headers: {} as AxiosRequestHeaders
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
    handleAxiosError(axiosError, contextMessage, mockLogger as Logger)

    expect(mockLogger.error).toHaveBeenCalledWith(
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
    handleAxiosError(genericError as AxiosError, contextMessage, mockLogger as Logger)

    expect(mockLogger.error).toHaveBeenCalledWith("Unexpected error during Axios request", {error: genericError})
  })
})
