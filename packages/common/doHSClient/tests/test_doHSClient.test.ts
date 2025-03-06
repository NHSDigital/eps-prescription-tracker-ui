import {jest} from "@jest/globals"

import {doHSClient} from "../src/doHSClient"
import axios, {AxiosError} from "axios"

jest.mock("axios")
const mockAxiosGet = jest.fn();
(axios.get as unknown as jest.Mock) = mockAxiosGet

describe("doHSClient", () => {
  const validApiKey = "dummy-api-key"
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

  it("returns mapped data on successful axios request", async () => {
    const odsCodes = {
      prescribingOrganization: "ABC",
      nominatedPerformer: "DEF"
    }
    // Simulate an API response that returns data for only one of the ODS codes.
    const responseData = {
      value: [{ODSCode: "ABC"}]
    }
    mockedAxios.get.mockResolvedValueOnce({data: responseData})

    const result = await doHSClient(odsCodes)

    expect(result).toEqual({
      prescribingOrganization: {ODSCode: "ABC"},
      nominatedPerformer: null
    })

    // Verify that axios.get was called with a URL containing the correct filter.
    const odsFilter = "ODSCode eq 'ABC' or ODSCode eq 'DEF'"
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
