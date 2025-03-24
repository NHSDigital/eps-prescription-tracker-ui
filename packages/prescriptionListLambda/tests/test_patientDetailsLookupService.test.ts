import {
  jest,
  describe,
  it,
  expect,
  beforeEach
} from "@jest/globals"
import {getPdsPatientDetails} from "../src/services/patientDetailsLookupService"
import {Logger} from "@aws-lambda-powertools/logger"
import {AxiosInstance, AxiosResponse} from "axios"
import {PDSError} from "../src/utils/errors"
import {mockPdsPatient} from "./mockObjects"

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

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should successfully fetch and map patient details", async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: mockPdsPatient
    } as unknown as AxiosResponse )

    const result = await getPdsPatientDetails(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockAxiosInstance as any, // Use type assertion to avoid TypeScript errors
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toMatchObject({
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

    const result = await getPdsPatientDetails(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toHaveProperty("_pdsError")
    expect(result._pdsError).toBeInstanceOf(PDSError)
    expect(result._pdsError?.message).toContain("Patient not found")
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

    const result = await getPdsPatientDetails(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toHaveProperty("_pdsError")
    expect(result._pdsError).toBeInstanceOf(PDSError)
    expect(result._pdsError?.message).toContain("Prescription not found")
    expect((result._pdsError as PDSError).code).toBe("S_FLAG")
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

    const result = await getPdsPatientDetails(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toHaveProperty("_pdsError")
    expect(result._pdsError).toBeInstanceOf(PDSError)
    expect(result._pdsError?.message).toContain("Prescription not found")
    expect((result._pdsError as PDSError).code).toBe("R_FLAG")
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

    const result = await getPdsPatientDetails(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toMatchObject({
      nhsNumber: newNhsNumber,
      supersededBy: newNhsNumber
    })
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

    const result = await getPdsPatientDetails(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toHaveProperty("_pdsError")
    expect(result._pdsError).toBeInstanceOf(PDSError)
    expect(result._pdsError?.message).toContain("Incomplete patient data")
    expect((result._pdsError as PDSError).code).toBe("INCOMPLETE_DATA")
  })

  it("should handle API errors", async () => {
    mockGet.mockRejectedValueOnce(new Error("API Error"))

    const result = await getPdsPatientDetails(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        mockNhsNumber,
        mockAccessToken,
        mockRoleId
    )

    expect(result).toHaveProperty("_pdsError")
    expect(result._pdsError).toBeInstanceOf(PDSError)
    expect(result._pdsError?.message).toContain("Failed to fetch patient details")
  })
})
