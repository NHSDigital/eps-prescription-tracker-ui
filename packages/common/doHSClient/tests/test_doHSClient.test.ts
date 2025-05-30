import {jest} from "@jest/globals"
import axios, {AxiosError} from "axios"

// Mock axios
jest.mock("axios")
const mockAxiosGet = jest.fn();
(axios.get as unknown as jest.Mock) = mockAxiosGet

// Mock environment variables by setting them before any module loads
const validApiKey = "dummy-api-key"
const validEndpoint = "https://api.example.com/dohs?query=true"

// Set environment variables before importing the module
process.env.apigeeApiKey = validApiKey
process.env.apigeeDoHSEndpoint = validEndpoint

// Now we can safely import the module
const {doHSClient} = await import("../src/doHSClient")

describe("doHSClient", () => {
  let mockedAxios

  beforeAll(() => {
    mockedAxios = axios as jest.Mocked<typeof axios>
  })

  beforeEach(() => {
    jest.clearAllMocks()
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

    mockedAxios.get.mockResolvedValueOnce({data: responseData})

    const result = await doHSClient(odsCodes)

    expect(result).toEqual({
      prescribingOrganization: {ODSCode: "ABC"},
      nominatedPerformer: null,
      dispensingOrganizations: [] // Expect an empty array if no matching dispensing organizations are found
    })

    // Verify that axios.get was called with a URL containing the correct filter.
    const odsFilter = "ODSCode eq 'ABC' or ODSCode eq 'DEF' or ODSCode eq 'XYZ' or ODSCode eq 'PQR'"
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining(`$filter=${odsFilter}`),
      {headers: {apikey: validApiKey}}
    )
  })

  it("handles AxiosError and throws error", async () => {
    const odsCodes = {prescribingOrganization: "ABC"}
    // Create a minimal AxiosError
    const axiosError = new Error("Request failed") as AxiosError
    axiosError.response = {
      status: 500,
      statusText: "Internal Server Error",
      data: "Internal Server Error",
      headers: {},
      config: {
        headers: undefined
      }
    }
    // Mark as an AxiosError
    axiosError.isAxiosError = true

    mockedAxios.get.mockRejectedValueOnce(axiosError)

    await expect(doHSClient(odsCodes)).rejects.toThrow(
      "Error fetching DoHS API data"
    )
  })
})
