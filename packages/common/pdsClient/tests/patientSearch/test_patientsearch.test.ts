/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  describe,
  it,
  expect,
  jest
} from "@jest/globals"
import {Logger} from "@aws-lambda-powertools/logger"
import * as examples from "./examples/index"

import * as pds from "@cpt-ui-common/pdsClient"
import {AxiosInstance, AxiosResponse} from "axios"

const OutcomeType = pds.patientSearch.OutcomeType

const mockLogger = new Logger({serviceName: "test"})

const mockAxiosInstance = (status: number, data: unknown) => {
  return {
    get: jest.fn(() => Promise.resolve({
      status,
      data
    } as unknown as AxiosResponse))
  } as unknown as AxiosInstance
}

describe("PatientSearch Unit Tests", () => {
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

  it("Should handle a pds error response", async () => {
    const _mockAxiosInstance = mockAxiosInstance(400, undefined)

    const client = new pds.Client(_mockAxiosInstance, "test-endpoint", mockLogger, "test-token", "test-role")

    const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

    expect(outcome.type).toBe(OutcomeType.PDS_ERROR)
  })

  it("Should correctly map a single patient", async () => {
    const _mockAxiosInstance = mockAxiosInstance(200, examples.single_patient)

    const client = new pds.Client(_mockAxiosInstance, "test-endpoint", mockLogger, "test-token", "test-role")
    const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

    expect(outcome.type).toBe(OutcomeType.SUCCESS)
    expect((outcome as any).patients).toEqual([{
      "nhsNumber": "9000000009",
      "familyName": "Smith",
      "givenName":  [
        "Jane"
      ],
      "gender": "female",
      "dateOfBirth": "2010-10-22",
      "address":  [
        "1 Trevelyan Square",
        "Boar Lane",
        "City Centre",
        "Leeds",
        "West Yorkshire"
      ],
      "postcode": "LS1 6AE"
    }])
  })

  it("Should correctly map two patients", async () => {
    const _mockAxiosInstance = mockAxiosInstance(200, examples.two_patients)

    const client = new pds.Client(_mockAxiosInstance, "test-endpoint", mockLogger, "test-token", "test-role")
    const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

    expect(outcome.type).toBe(OutcomeType.SUCCESS)
    expect((outcome as any).patients).toEqual([
      {
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "Smith",
        givenName: [ "Jane" ],
        address: [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        postcode: "LS1 6AE"
      },
      {
        nhsNumber: "9000000017",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "Smyth",
        givenName: [ "Jayne" ],
        address: [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        postcode: "LS1 6AE"
      }
    ])
  })

  it("Should handle a response with no patients", async () => {
    const _mockAxiosInstance = mockAxiosInstance(200, examples.no_patients)

    const client = new pds.Client(_mockAxiosInstance, "test-endpoint", mockLogger, "test-token", "test-role")
    const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

    expect(outcome.type).toBe(OutcomeType.SUCCESS)
    expect((outcome as any).patients).toEqual([])
  })

  it("Should handle a too many matches response", async () => {
    const _mockAxiosInstance = mockAxiosInstance(200, examples.too_many_matches)

    const client = new pds.Client(_mockAxiosInstance, "test-endpoint", mockLogger, "test-token", "test-role")
    const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

    expect(outcome.type).toBe(OutcomeType.TOO_MANY_MATCHES)
  })

  it("Should filter out restricted patients", async () => {
    const _mockAxiosInstance = mockAxiosInstance(200, examples.single_restricted)

    const client = new pds.Client(_mockAxiosInstance, "test-endpoint", mockLogger, "test-token", "test-role")
    const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

    expect(outcome.type).toBe(OutcomeType.SUCCESS)
    expect((outcome as any).patients).toEqual([])
  })

  it("Should handle a response with restricted and unrestricted patients", async () => {
    const _mockAxiosInstance = mockAxiosInstance(200, examples.multiple_with_restricted)

    const client = new pds.Client(_mockAxiosInstance, "test-endpoint", mockLogger, "test-token", "test-role")
    const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

    expect(outcome.type).toBe(OutcomeType.SUCCESS)
    expect((outcome as any).patients).toEqual([{
      "address": [
        "1 Trevelyan Square",
        "Boar Lane",
        "City Centre",
        "Leeds",
        "West Yorkshire"
      ],
      "dateOfBirth": "2010-10-22",
      "familyName": "Smith",
      "gender": "female",
      "givenName": [
        "Jane"
      ],
      "nhsNumber": "9000000009",
      "postcode": "LS1 6AE"
    }])

  })
})
