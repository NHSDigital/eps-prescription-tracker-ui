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
  const mockEndpoint = "http://test-endpoint"
  const mockAccessToken = "test-token"
  const mockRoleId = "test-role"
  const mockNhsNumber = "9999999999"

  const mockPdsResponse = {
    id: mockNhsNumber,
    name: [{
      given: ["John"],
      family: "Doe",
      prefix: ["Mr"],
      suffix: ["Jr"]
    }],
    gender: "male",
    birthDate: "1990-01-01",
    address: [{
      line: ["123 Test Street", "Apt 4B"],
      city: "London",
      postalCode: "SW1A 1AA"
    }]
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should successfully fetch and map patient details", async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      data: mockPdsResponse
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
      given: "John",
      family: "Doe",
      prefix: "Mr",
      suffix: "Jr",
      gender: "male",
      dateOfBirth: "1990-01-01",
      address: {
        line1: "123 Test Street",
        line2: "Apt 4B",
        city: "London",
        postcode: "SW1A 1AA"
      }
    })

    expect(mockGet).toHaveBeenCalledWith(
      `${mockEndpoint}/personal-demographics/FHIR/R4/Patient/${mockNhsNumber}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockAccessToken}`,
          "nhsd-session-urid": mockRoleId
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
        ...mockPdsResponse,
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
        ...mockPdsResponse,
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
        ...mockPdsResponse,
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
