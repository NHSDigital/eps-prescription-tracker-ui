import {
  jest,
  describe,
  it,
  expect,
  beforeEach
} from "@jest/globals"
import {getPrescriptions, PrescriptionError} from "../src/services/prescriptionsLookupService"
import {Logger} from "@aws-lambda-powertools/logger"
import {AxiosInstance, AxiosResponse} from "axios"
import {TreatmentType} from "../src/types"
import {mockPrescriptionBundle} from "./mockObjects"

const mockGet = jest.fn(() => Promise.resolve({} as unknown as AxiosResponse))
const mockAxiosInstance = {
  get: mockGet
}

jest.mock("axios", () => ({
  create: () => mockAxiosInstance
}))

describe("Prescriptions Lookup Service Tests", () => {
  const mockLogger = new Logger({serviceName: "test"})
  const mockEndpoint = "http://test-endpoint/clinical-prescription-tracker"
  const mockAccessToken = "test-token"
  const mockRoleId = "test-role"

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getPrescriptions with prescriptionId", () => {
    const mockPrescriptionId = "01ABC123"

    it("should successfully fetch and map prescription by ID", async () => {
      mockGet.mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        data: mockPrescriptionBundle
      } as unknown as AxiosResponse)

      const result = await getPrescriptions(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        {prescriptionId: mockPrescriptionId},
        mockAccessToken,
        mockRoleId
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        prescriptionId: mockPrescriptionId,
        statusCode: "0001",
        issueDate: "2023-01-01",
        prescriptionTreatmentType: TreatmentType.ACUTE,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: false,
        nhsNumber: 9999999999
      })

      // Verify the API call
      expect(mockGet).toHaveBeenCalledWith(
        `${mockEndpoint}/RequestGroup?prescriptionId=${mockPrescriptionId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
            "nhsd-session-urid": mockRoleId
          })
        })
      )
    })

    it("should handle prescription not found", async () => {
      mockGet.mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        data: null
      } as unknown as AxiosResponse)

      await expect(
        getPrescriptions(
          mockAxiosInstance as unknown as AxiosInstance,
          mockLogger,
          mockEndpoint,
          {prescriptionId: mockPrescriptionId},
          mockAccessToken,
          mockRoleId
        )
      ).rejects.toThrow(PrescriptionError)
    })

    it("should handle API errors", async () => {
      mockGet.mockRejectedValueOnce(new Error("API Error"))

      await expect(
        getPrescriptions(
          mockAxiosInstance as unknown as AxiosInstance,
          mockLogger,
          mockEndpoint,
          {prescriptionId: mockPrescriptionId},
          mockAccessToken,
          mockRoleId
        )
      ).rejects.toThrow(PrescriptionError)
    })
  })

  describe("getPrescriptions with nhsNumber", () => {
    const mockNhsNumber = "9999999999"

    it("should successfully fetch and map prescriptions by NHS number", async () => {
      mockGet.mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        data: mockPrescriptionBundle
      } as unknown as AxiosResponse)

      const result = await getPrescriptions(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        {nhsNumber: mockNhsNumber},
        mockAccessToken,
        mockRoleId
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        prescriptionId: "01ABC123",
        statusCode: "0001",
        issueDate: "2023-01-01",
        prescriptionTreatmentType: TreatmentType.ACUTE,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: false,
        nhsNumber: 9999999999
      })

      // Verify the API call
      expect(mockGet).toHaveBeenCalledWith(
        `${mockEndpoint}/RequestGroup?nhsNumber=${mockNhsNumber}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
            "nhsd-session-urid": mockRoleId
          })
        })
      )
    })

    it("should handle no prescriptions found", async () => {
      mockGet.mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        data: {
          resourceType: "Bundle",
          type: "searchset",
          total: 0,
          entry: []
        }
      } as unknown as AxiosResponse)

      const result = await getPrescriptions(
        mockAxiosInstance as unknown as AxiosInstance,
        mockLogger,
        mockEndpoint,
        {nhsNumber: mockNhsNumber},
        mockAccessToken,
        mockRoleId
      )

      expect(result).toHaveLength(0)
    })

    it("should handle API errors", async () => {
      mockGet.mockRejectedValueOnce(new Error("API Error"))

      await expect(
        getPrescriptions(
          mockAxiosInstance as unknown as AxiosInstance,
          mockLogger,
          mockEndpoint,
          {nhsNumber: mockNhsNumber},
          mockAccessToken,
          mockRoleId
        )
      ).rejects.toThrow(PrescriptionError)
    })
  })
})
