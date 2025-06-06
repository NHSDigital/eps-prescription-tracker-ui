import {jest} from "@jest/globals"
import nock from "nock"

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
      console.warn("Unused nock interceptors:", nock.pendingMocks())
      nock.cleanAll()
    }
  })

  it("throws an error if no ODS codes are provided", async () => {
    await expect(doHSClient({})).rejects.toThrow(
      "At least one ODS Code is required for DoHS API request"
    )
  })

  it("throws an error if apigeeApiKey is not set", async () => {
    // Temporarily unset the API key
    const originalApiKey = process.env.apigeeApiKey
    delete process.env.apigeeApiKey

    // Re-import the module to pick up the changed environment
    jest.resetModules()
    const {doHSClient: freshDoHSClient} = await import("../src/doHSClient")

    await expect(freshDoHSClient({prescribingOrganization: "ABC"})).rejects.toThrow(
      "Apigee API Key environment variable is not set"
    )

    // Restore the API key
    process.env.apigeeApiKey = originalApiKey
  })

  it("throws an error if apigeeDoHSEndpoint is not set", async () => {
    // Temporarily unset the endpoint
    const originalEndpoint = process.env.apigeeDoHSEndpoint
    delete process.env.apigeeDoHSEndpoint

    // Re-import the module to pick up the changed environment
    jest.resetModules()
    const {doHSClient: freshDoHSClient} = await import("../src/doHSClient")

    await expect(freshDoHSClient({prescribingOrganization: "ABC"})).rejects.toThrow(
      "DoHS API endpoint environment variable is not set"
    )

    // Restore the endpoint
    process.env.apigeeDoHSEndpoint = originalEndpoint
  })

  it("returns mapped data on successful axios request", async () => {
    const odsCodes = {
      prescribingOrganization: "ABC",
      nominatedPerformer: "DEF",
      dispensingOrganizations: ["XYZ", "PQR"]
    }

    // Simulate an API response that returns data for only one of the ODS codes.
    const responseData = {
      value: [{ODSCode: "ABC"}]
    }

    // Set up nock to intercept the HTTP request
    const odsFilter = "ODSCode eq 'ABC' or ODSCode eq 'DEF' or ODSCode eq 'XYZ' or ODSCode eq 'PQR'"
    nock("https://api.example.com")
      .get("/dohs")
      .query({
        "api-version": "3",
        "$filter": odsFilter
      })
      .matchHeader("apikey", validApiKey)
      .reply(200, responseData)

    const result = await doHSClient(odsCodes)

    expect(result).toEqual({
      prescribingOrganization: {ODSCode: "ABC"},
      nominatedPerformer: null,
      dispensingOrganizations: [] // Expect an empty array if no matching dispensing organizations are found
    })
  })

  it("handles HTTP errors and throws error", async () => {
    const odsCodes = {prescribingOrganization: "ABC"}

    // Set up nock to simulate an HTTP error
    const odsFilter = "ODSCode eq 'ABC'"
    nock("https://api.example.com")
      .get("/dohs")
      .query({
        "$filter": odsFilter
      })
      .matchHeader("apikey", validApiKey)
      .reply(500, "Internal Server Error")

    await expect(doHSClient(odsCodes)).rejects.toThrow(
      "Error fetching DoHS API data"
    )
  })

  it("handles network errors and throws error", async () => {
    const odsCodes = {prescribingOrganization: "ABC"}

    // Set up nock to simulate a network error
    const odsFilter = "ODSCode eq 'ABC'"
    nock("https://api.example.com")
      .get("/dohs")
      .query({
        "$filter": odsFilter
      })
      .matchHeader("apikey", validApiKey)
      .replyWithError("Network Error")

    await expect(doHSClient(odsCodes)).rejects.toThrow(
      "Error fetching DoHS API data"
    )
  })
})
