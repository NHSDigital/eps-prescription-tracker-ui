/* eslint-disable @typescript-eslint/consistent-type-assertions */
import {jest} from "@jest/globals"
import {AxiosError, InternalAxiosRequestConfig} from "axios"
import {handleErrorResponse} from "../src/utils/errorUtils"

// Mock dependencies
jest.mock("@aws-lambda-powertools/logger", () => {
  return {
    Logger: jest.fn(() => ({
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    }))
  }
})

describe("handleErrorResponse", () => {
  test("returns a formatted response for an Axios error", () => {
    const axiosError: AxiosError = {
      message: "Request failed",
      name: "AxiosError",
      isAxiosError: true,
      response: {
        status: 400,
        data: {error: "Invalid input"},
        headers: {},
        config: {} as InternalAxiosRequestConfig,
        statusText: ""
      },
      config: {} as InternalAxiosRequestConfig,
      toJSON: () => ({message: "Request failed", name: "AxiosError"})
    }

    const result = handleErrorResponse(axiosError, "Default error message")

    expect(result).toEqual({
      statusCode: 400,
      body: JSON.stringify({
        message: "Default error message",
        details: {error: "Invalid input"}
      })
    })
  })

  test("returns a formatted response for a non-Axios error", () => {
    const nonAxiosError = new Error("Unexpected failure")

    const result = handleErrorResponse(nonAxiosError, "Default error message")

    expect(result).toEqual({
      statusCode: 500,
      body: JSON.stringify({
        message: "Default error message",
        details: "Unexpected failure"
      })
    })
  })

  test("returns a generic response when error is unknown", () => {
    const result = handleErrorResponse(null, "Default error message")

    expect(result).toEqual({
      statusCode: 500,
      body: JSON.stringify({
        message: "Default error message",
        details: "Unknown error occurred"
      })
    })
  })
})
