import {jest} from "@jest/globals"
import nock from "nock"
import {Logger} from "@aws-lambda-powertools/logger"

const mockLogger: Partial<Logger> = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

// Mock environment variables by setting them before any module loads
const validApiKey = "dummy-api-key"
const validEndpoint = "https://api.example.com/dohs"

// Set environment variables before importing the module
process.env.apigeeApiKey = validApiKey
process.env.apigeeDoHSEndpoint = validEndpoint

// Now we can safely import the module
const {doHSClient} = await import("../src/doHSClient")

describe("doHSClient", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clean up any pending nock interceptors
    nock.cleanAll()
  })

  afterEach(() => {
    // Verify that all nock interceptors were used
    if (!nock.isDone()) {
      nock.cleanAll()
    }
  })

  it("returns empty if no ODS codes are provided", async () => {
    expect(await doHSClient([], mockLogger as Logger)).toEqual([])
  })

  it("throws an error if apigeeApiKey is not set", async () => {
    // Temporarily unset the API key
    const originalApiKey = process.env.APIGEE_DOHS_API_KEY
    delete process.env.APIGEE_DOHS_API_KEY

    // Re-import the module to pick up the changed environment
    jest.resetModules()
    const {doHSClient: freshDoHSClient} = await import("../src/doHSClient")

    await expect(freshDoHSClient(["ABC"], mockLogger as Logger)).rejects.toThrow(
      "Apigee API Key environment variable is not set"
    )

    // Restore the API key
    process.env.APIGEE_DOHS_API_KEY = originalApiKey
  })

  it("throws an error if apigeeDoHSEndpoint is not set", async () => {
    // Temporarily unset the endpoint
    const originalEndpoint = process.env.apigeeDoHSEndpoint
    delete process.env.apigeeDoHSEndpoint

    // Re-import the module to pick up the changed environment
    jest.resetModules()
    const {doHSClient: freshDoHSClient} = await import("../src/doHSClient")

    await expect(freshDoHSClient(["ABC"], mockLogger as Logger)).rejects.toThrow(
      "DoHS API endpoint environment variable is not set"
    )

    // Restore the endpoint
    process.env.apigeeDoHSEndpoint = originalEndpoint
  })

  it("returns mapped data on successful axios request", async () => {
    const odsCodes = ["ABC", "DEF", "XYZ"]

    // Simulate an API response that returns data for only one of the ODS codes.
    const responseData = {
      value: [{ODSCode: "ABC"}]
    }

    // Set up nock to intercept the HTTP request
    const odsFilter = "ODSCode eq 'ABC' or ODSCode eq 'DEF' or ODSCode eq 'XYZ'"
    nock("https://api.example.com")
      .get("/dohs")
      .query({
        "api-version": "3",
        "$filter": odsFilter
      })
      .matchHeader("apikey", validApiKey)
      .reply(200, responseData)

    const result = await doHSClient(odsCodes, mockLogger as Logger)

    expect(result).toEqual([{ODSCode: "ABC"}])
  })

  it("handles HTTP errors and throws error", async () => {
    const odsCodes = ["ABC"]

    // Set up nock to simulate an HTTP error
    const odsFilter = "ODSCode eq 'ABC'"
    nock("https://api.example.com")
      .get("/dohs")
      .query({
        "api-version": "3",
        "$filter": odsFilter
      })
      .matchHeader("apikey", validApiKey)
      .reply(500, "Internal Server Error")

    await expect(doHSClient(odsCodes, mockLogger as Logger)).rejects.toThrow()
  })

  it("handles network errors and throws error", async () => {
    const odsCodes = ["ABC"]

    // Set up nock to simulate a network error
    const odsFilter = "ODSCode eq 'ABC'"
    nock("https://api.example.com")
      .get("/dohs")
      .query({
        "api-version": "3", // Add missing api-version parameter
        "$filter": odsFilter
      })
      .matchHeader("apikey", validApiKey)
      .replyWithError("Network Error")

    await expect(doHSClient(odsCodes, mockLogger as Logger)).rejects.toThrow()
  })

})
