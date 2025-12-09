import {
  jest,
  describe,
  it,
  expect,
  beforeEach
} from "@jest/globals"
import nock from "nock"
import {getPrescriptions} from "../src/services/prescriptionsLookupService"
import {Logger} from "@aws-lambda-powertools/logger"
import axios from "axios"
import {TreatmentType} from "@cpt-ui-common/common-types"
import {mockPrescriptionBundle} from "./mockObjects"
const axiosInstance = axios.create()

describe("Prescriptions Lookup Service Tests", () => {
  const mockLogger = new Logger({serviceName: "test"})
  const mockEndpoint = "http://test-endpoint/clinical-prescription-tracker"
  const mockAccessToken = "test-token"
  const mockRoleId = "test-role"
  const mockOrgCode = "mock-org"
  const mockCorrelationId = "mock-correlationId"

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getPrescriptions with prescriptionId", () => {
    const mockPrescriptionId = "01ABC123"

    it("should successfully fetch and map prescription by ID", async () => {
      nock( mockEndpoint )
        .get("/RequestGroup")
        .query({
          prescriptionId: mockPrescriptionId
        })
        .reply(200, mockPrescriptionBundle)

      const result = await getPrescriptions(
        axiosInstance,
        mockLogger,
        mockEndpoint,
        {prescriptionId: mockPrescriptionId},
        mockAccessToken,
        mockRoleId,
        mockOrgCode,
        mockCorrelationId
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        prescriptionId: mockPrescriptionId,
        statusCode: "0001",
        issueDate: "2023-01-01",
        prescriptionTreatmentType: TreatmentType.ACUTE,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: false,
        nhsNumber: "9999999999"
      })
    })

    it("should handle prescription not found", async () => {

      nock( mockEndpoint )
        .get("/RequestGroup")
        .query({
          prescriptionId: mockPrescriptionId
        })
        .reply(200)

      const result = await getPrescriptions(
        axiosInstance,
        mockLogger,
        mockEndpoint,
        {prescriptionId: mockPrescriptionId},
        mockAccessToken,
        mockRoleId,
        mockOrgCode,
        mockCorrelationId
      )
      expect(result).toHaveLength(0)
    })

    it("should handle API errors", async () => {
      nock( mockEndpoint )
        .get("/RequestGroup")
        .query({
          prescriptionId: mockPrescriptionId
        })
        .reply(500)

      const action = getPrescriptions(
        axiosInstance,
        mockLogger,
        mockEndpoint,
        {prescriptionId: mockPrescriptionId},
        mockAccessToken,
        mockRoleId,
        mockOrgCode,
        mockCorrelationId
      )
      expect(action).rejects.toThrow(Error)
      await expect(action).rejects.toThrow("Request failed with status code 500")
    })
  })

  describe("getPrescriptions with nhsNumber", () => {
    const mockNhsNumber = "9999999999"

    it("should successfully fetch and map prescriptions by NHS number", async () => {
      nock( mockEndpoint )
        .get("/RequestGroup")
        .query({
          nhsNumber: mockNhsNumber
        })
        .reply(200, mockPrescriptionBundle)

      const result = await getPrescriptions(
        axiosInstance,
        mockLogger,
        mockEndpoint,
        {nhsNumber: mockNhsNumber},
        mockAccessToken,
        mockRoleId,
        mockOrgCode,
        mockCorrelationId
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        prescriptionId: "01ABC123",
        statusCode: "0001",
        issueDate: "2023-01-01",
        prescriptionTreatmentType: TreatmentType.ACUTE,
        prescriptionPendingCancellation: false,
        itemsPendingCancellation: false,
        nhsNumber: "9999999999"
      })
    })

    it("should handle no prescriptions found", async () => {

      nock( mockEndpoint )
        .get("/RequestGroup")
        .query({
          nhsNumber: mockNhsNumber
        })
        .reply(200, {
          resourceType: "Bundle",
          type: "searchset",
          total: 0,
          entry: []
        })
      const result = await getPrescriptions(
        axiosInstance,
        mockLogger,
        mockEndpoint,
        {nhsNumber: mockNhsNumber},
        mockAccessToken,
        mockRoleId,
        mockOrgCode,
        mockCorrelationId
      )

      expect(result).toHaveLength(0)
    })

    it("should handle API errors", async () => {
      nock( mockEndpoint )
        .get("/RequestGroup")
        .query({
          nhsNumber: mockNhsNumber
        })
        .reply(500)

      const action = getPrescriptions(
        axiosInstance,
        mockLogger,
        mockEndpoint,
        {nhsNumber: mockNhsNumber},
        mockAccessToken,
        mockRoleId,
        mockOrgCode,
        mockCorrelationId
      )

      await expect(action).rejects.toThrow("Request failed with status code 500")
    })
  })
})
