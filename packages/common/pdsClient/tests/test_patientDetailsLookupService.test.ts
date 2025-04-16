/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  jest,
  describe,
  it,
  expect,
  beforeEach
} from "@jest/globals"
import {AxiosInstance, AxiosResponse} from "axios"
import {mockPdsPatient} from "./mockObjects"
import {Logger} from "@aws-lambda-powertools/logger"

import * as pds from "@cpt-ui-common/pdsClient"

const OutcomeType = pds.patientDetailsLookup.OutcomeType
const ValidatePatientDetailsOutcomeType = pds.patientDetailsLookup.ValidatePatientDetails.OutcomeType

// Create mock axios instance with get method
const mockGet = jest.fn(() => Promise.resolve({} as unknown as AxiosResponse))
const mockAxiosInstance = {
  get: mockGet
}

// Mock the axios module
jest.mock("axios", () => ({
  create: () => mockAxiosInstance
}))

describe("Patient Details Lookup Service Tests", () => {
  const mockLogger = new Logger({serviceName: "test"})
  const mockEndpoint = "http://test-endpoint/personal-demographics/FHIR/R4"
  const mockAccessToken = "test-token"
  const mockRoleId = "test-role"
  const mockNhsNumber = "9000000009"
  const mockPdsClient = new pds.Client(
    mockAxiosInstance as unknown as AxiosInstance,
    mockEndpoint,
    mockLogger,
    mockAccessToken,
    mockRoleId
  )

  const makeRequest = async () => {
    return await mockPdsClient.getPatientDetails(mockNhsNumber)
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should successfully fetch and map patient details", async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: mockPdsPatient
    } as unknown as AxiosResponse )

    const outcome = await makeRequest()

    expect(outcome.type).toBe(OutcomeType.SUCCESS)

    expect((outcome as any).patientDetails).toMatchObject({
      nhsNumber: mockNhsNumber,
      given: "Jane",
      family: "Smith",
      prefix: "Mrs",
      suffix: "",
      gender: "female",
      dateOfBirth: "2010-10-22",
      address: {
        line1: "1 Trevelyan Square",
        line2: "Boar Lane",
        city: "Leeds",
        postcode: "LS1 6AE"
      }
    })

    expect(mockGet).toHaveBeenCalledWith(
      `${mockEndpoint}/Patient/${mockNhsNumber}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockAccessToken}`,
          "NHSD-Session-URID": mockRoleId
        })
      })
    )
  })

  it("should handle patient not found", async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: null
    } as unknown as AxiosResponse)

    const outcome = await makeRequest()

    expect(outcome.type).toBe(OutcomeType.PATIENT_NOT_FOUND)
  })

  it("should detect and handle S-Flag", async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: {
        ...mockPdsPatient,
        meta: {
          security: [{code: "S"}]
        }
      }
    } as unknown as AxiosResponse)

    const outcome = await makeRequest()

    expect(outcome.type).toBe(OutcomeType.S_FLAG)
  })

  it("should detect and handle R-Flag", async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: {
        ...mockPdsPatient,
        meta: {
          security: [{code: "R"}]
        }
      }
    } as unknown as AxiosResponse)

    const outcome = await makeRequest()

    expect(outcome.type).toBe(OutcomeType.R_FLAG)
  })

  it("should handle superseded NHS numbers", async () => {
    const newNhsNumber = "8888888888"
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: {
        ...mockPdsPatient,
        id: newNhsNumber // Different NHS number than the requested one
      }
    } as unknown as AxiosResponse)

    const outcome = await makeRequest()

    expect(outcome.type).toBe(OutcomeType.SUPERSEDED)

    expect((outcome as any).supersededBy).toBe(newNhsNumber)
  })

  it("should handle incomplete patient data", async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: {
        id: mockNhsNumber
        // Missing name details
      }
    } as unknown as AxiosResponse)

    const outcome = await makeRequest()

    expect(outcome.type).toBe(OutcomeType.PATIENT_DETAILS_VALIDATION_ERROR)
    expect((outcome as any).error.type).toBe(ValidatePatientDetailsOutcomeType.MISSING_FIELDS)
    expect((outcome as any).error.missingFields).toEqual(["given", "family"])
  })

  it("should handle API errors", async () => {
    mockGet.mockRejectedValueOnce(new Error("API Error"))

    const outcome = await makeRequest()

    expect(outcome.type).toBe(OutcomeType.AXIOS_ERROR)
  })
})
