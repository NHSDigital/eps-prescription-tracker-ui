import {
  describe,
  it,
  expect,
  jest
} from "@jest/globals"
import {AxiosInstance, AxiosResponse} from "axios"
import {Logger} from "@aws-lambda-powertools/logger"

import * as pds from "@cpt-ui-common/pdsClient"

const OutcomeType = pds.patientSearch.OutcomeType

const mockLogger = new Logger({serviceName: "test"})

describe("PatientSearch Tests", () => {
  it("Should handle an axios error", async () => {
    // Create mock axios instance with get method
    const mockGet = jest.fn(() => Promise.reject({} as unknown as AxiosResponse))
    const mockAxiosInstance = {
      get: mockGet
    } as unknown as AxiosInstance

    const client = new pds.Client(mockAxiosInstance, "test-endpoint", mockLogger, "test-token", "test-role")

    const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

    expect(outcome.type).toBe(OutcomeType.AXIOS_ERROR)
  })

  it("Should handle a too many matches response", async () => {
    // Create mock axios instance with get method
    const mockGet = jest.fn(() => Promise.resolve({
      status: 200,
      data: {
        "resourceType": "OperationOutcome",
        "issue": [
          {
            "code": "TOO_MANY_MATCHES",
            "display": "Too many matches"
          }
        ]
      }
    } as unknown as AxiosResponse))
    const mockAxiosInstance = {
      get: mockGet
    } as unknown as AxiosInstance

    const client = new pds.Client(mockAxiosInstance, "test-endpoint", mockLogger, "test-token", "test-role")

    const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

    expect(outcome.type).toBe(OutcomeType.TOO_MANY_MATCHES)
  })

  it("Should handle a pds error response", async () => {
    // Create mock axios instance with get method
    const mockGet = jest.fn(() => Promise.resolve({
      status: 400
    } as unknown as AxiosResponse))
    const mockAxiosInstance = {
      get: mockGet
    } as unknown as AxiosInstance

    const client = new pds.Client(mockAxiosInstance, "test-endpoint", mockLogger, "test-token", "test-role")

    const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

    expect(outcome.type).toBe(OutcomeType.PDS_ERROR)
  })
})
