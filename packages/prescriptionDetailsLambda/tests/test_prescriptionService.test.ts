import {jest} from "@jest/globals"
import nock from "nock"

import type {APIGatewayProxyEvent} from "aws-lambda"
import type {Logger} from "@aws-lambda-powertools/logger"

import type {ApigeeDataResponse} from "../src/utils/types"

// Mock uuid so that it is predictable.
jest.unstable_mockModule("uuid", () => ({
  v4: jest.fn(() => "test-uuid")
}))

// Create a mock for the doHSClient function.
const mockDoHSClient = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/doHSClient", () => ({
  doHSClient: mockDoHSClient
}))

// Mock mergePrescriptionDetails from responseMapper.
const mockMergePrescriptionDetails = jest.fn()
jest.unstable_mockModule("../src/utils/responseMapper", () => ({
  mergePrescriptionDetails: mockMergePrescriptionDetails
}))

// Mock formatHeaders from headerUtils.
const mockFormatHeaders = jest.fn((headers) => headers)
jest.unstable_mockModule("../src/utils/headerUtils", () => ({
  formatHeaders: mockFormatHeaders
}))

// Import some mock objects to use in our tests.
import {mockAPIGatewayProxyEvent, mockFhirParticipant} from "./mockObjects"

const {
  extractOdsCodes,
  getDoHSData,
  processPrescriptionRequest
} = await import("../src/services/prescriptionService")

const mockBuildApigeeHeaders = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => ({
  buildApigeeHeaders: mockBuildApigeeHeaders
}))

describe("prescriptionService", () => {
  let logger: Logger

  beforeEach(() => {
    jest.restoreAllMocks()
    // Clean up any pending nock interceptors
    nock.cleanAll()
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as Logger
  })

  afterEach(() => {
    // Verify that all nock interceptors were used
    if (!nock.isDone()) {
      console.warn("Unused nock interceptors:", nock.pendingMocks())
      nock.cleanAll()
    }
  })

  describe("extractOdsCodes", () => {
    it("should extract ODS codes correctly from a valid ApigeeDataResponse", () => {
      // Create a sample ApigeeDataResponse with an author and actions.
      const apigeeData: ApigeeDataResponse = {
        author: {
          identifier: {
            value: "ODS_AUTHOR"
          }
        },
        action: [
          {
            // This action will provide the nominatedPerformer.
            participant: [mockFhirParticipant]
          },
          {
            // This action has nested actions to simulate dispensing organizations.
            action: [
              {
                title: "Dispense notification successful",
                participant: [{identifier: {value: "ODS_DISPENSE"}}]
              },
              {
                title: "Some other action",
                participant: [{identifier: {value: "IGNORED"}}]
              }
            ]
          }
        ]
      }

      const result = extractOdsCodes(apigeeData, logger)
      expect(result.prescribingOrganization).toEqual("ODS_AUTHOR")
      expect(result.nominatedPerformer).toEqual("ODS123456")
      expect(result.dispensingOrganizations).toEqual(["ODS_DISPENSE"])

      // Verify that a log entry was made.
      expect(logger.info).toHaveBeenCalledWith(
        "Extracted ODS codes from Apigee",
        expect.objectContaining({
          prescribingOrganization: "ODS_AUTHOR",
          nominatedPerformer: "ODS123456",
          dispensingOrganizations: ["ODS_DISPENSE"]
        })
      )
    })

    it("should handle missing data gracefully", () => {
      const apigeeData: ApigeeDataResponse = {}
      const result = extractOdsCodes(apigeeData, logger)
      expect(result.prescribingOrganization).toBeUndefined()
      expect(result.nominatedPerformer).toBeUndefined()
      expect(result.dispensingOrganizations).toBeUndefined()

      // Even though no data is present, the logger should receive an empty array for dispensingOrganizations.
      expect(logger.info).toHaveBeenCalledWith(
        "Extracted ODS codes from Apigee",
        expect.objectContaining({
          prescribingOrganization: undefined,
          nominatedPerformer: undefined,
          dispensingOrganizations: []
        })
      )
    })
  })

  describe("getDoHSData", () => {
    // Prepare sample odsCodes.
    const odsCodes = {
      prescribingOrganization: "ODS123",
      nominatedPerformer: "ODS456",
      dispensingOrganizations: ["ODS789"]
    }

    it("should return default DoHSData if no valid odsCodes are provided", async () => {
      const emptyOdsCodes = {
        prescribingOrganization: undefined,
        nominatedPerformer: undefined,
        dispensingOrganizations: undefined
      }

      const result = await getDoHSData(emptyOdsCodes, logger)
      expect(result).toEqual({
        prescribingOrganization: null,
        nominatedPerformer: null,
        dispensingOrganizations: []
      })
      // doHSClient should not be called if no valid odsCodes are present.
      expect(mockDoHSClient).not.toHaveBeenCalled()
    })

    it("should return mapped DoHSData when matching ODS codes are returned", async () => {
      // Setup the mockDoHSClient to return matching data.
      const mockDoHSResponse = {
        prescribingOrganization: {
          ODSCode: "ODS123",
          OrganisationName: "Org Prescriber"
        },
        nominatedPerformer: {
          ODSCode: "ODS456",
          OrganisationName: "Org Performer"
        },
        dispensingOrganizations: [
          {
            ODSCode: "ODS789",
            OrganisationName: "Org Dispenser"
          },
          {
            ODSCode: "ODS000",
            OrganisationName: "Non matching org"
          }
        ]
      }
      mockDoHSClient.mockImplementationOnce(() => Promise.resolve(mockDoHSResponse))

      const result = await getDoHSData(odsCodes, logger)
      expect(result.prescribingOrganization).toEqual(mockDoHSResponse.prescribingOrganization)
      expect(result.nominatedPerformer).toEqual(mockDoHSResponse.nominatedPerformer)
      expect(result.dispensingOrganizations).toEqual([
        {
          ODSCode: "ODS789",
          OrganisationName: "Org Dispenser"
        }
      ])

      expect(logger.info).toHaveBeenCalledWith(
        "Successfully fetched DoHS API data",
        {rawDoHSData: mockDoHSResponse}
      )
      expect(logger.info).toHaveBeenCalledWith(
        "Mapped DoHS organizations",
        expect.objectContaining({
          prescribingOrganization: "Org Prescriber",
          nominatedPerformer: "Org Performer",
          dispensingOrganizations: ["Org Dispenser"]
        })
      )
    })

    it("should return default DoHSData when ODS codes do not match", async () => {
      // Setup the mockDoHSClient to return data with non-matching ODS codes.
      const mockDoHSResponse = {
        prescribingOrganization: {
          ODSCode: "MISMATCH",
          OrganisationName: "Org Prescriber"
        },
        nominatedPerformer: {
          ODSCode: "MISMATCH",
          OrganisationName: "Org Performer"
        },
        dispensingOrganizations: [
          {
            ODSCode: "MISMATCH",
            OrganisationName: "Org Dispenser"
          }
        ]
      }
      mockDoHSClient.mockImplementationOnce(() => Promise.resolve(mockDoHSResponse))

      const result = await getDoHSData(odsCodes, logger)
      expect(result.prescribingOrganization).toBeNull()
      expect(result.nominatedPerformer).toBeNull()
      expect(result.dispensingOrganizations).toEqual([])
    })

    it("should handle errors from doHSClient and return default DoHSData", async () => {
      mockDoHSClient.mockImplementationOnce(() => Promise.reject(new Error("API Error")))

      const result = await getDoHSData(odsCodes, logger)
      expect(result).toEqual({
        prescribingOrganization: null,
        nominatedPerformer: null,
        dispensingOrganizations: []
      })
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch DoHS API data",
        expect.objectContaining({error: expect.any(Error)})
      )
    })
  })

  describe("processPrescriptionRequest", () => {
    const apigeePrescriptionsEndpoint = "https://api.example.com/"
    const apigeeAccessToken = "sampleToken"
    const roleId = "sampleRole"

    it("should return 400 if prescriptionId is missing", async () => {
      const event: APIGatewayProxyEvent = {
        ...mockAPIGatewayProxyEvent,
        pathParameters: {} // No prescriptionId provided
      }

      const result = await processPrescriptionRequest(
        event,
        apigeePrescriptionsEndpoint,
        apigeeAccessToken,
        roleId,
        "",
        "",
        logger
      )

      expect(result.statusCode).toEqual(400)
      const body = JSON.parse(result.body)
      expect(body).toEqual({
        message: "Missing prescription ID in request",
        prescriptionId: null
      })
      expect(logger.warn).toHaveBeenCalledWith("No prescription ID provided in request", {event})
    })

    it("should process and return merged response when successful", async () => {
      const prescriptionId = "RX123"
      const event: APIGatewayProxyEvent = {
        ...mockAPIGatewayProxyEvent,
        pathParameters: {prescriptionId}
      }

      // Create a fake Apigee response with necessary fields.
      const fakeApigeeData = {
        author: {
          identifier: {
            value: "ODS_AUTHOR"
          }
        },
        action: [
          {
            participant: [
              {identifier: {system: "https://fhir.nhs.uk/Id/ods-organization-code", value: "ODS123456"}}
            ]
          },
          {
            action: [
              {
                title: "Dispense notification successful",
                participant: [{identifier: {value: "ODS_DISPENSE"}}]
              }
            ]
          }
        ]
      }

      const fakeApigeeHeaders = {"content-type": "application/json"}

      // Set up nock to intercept the HTTP request - note the RequestGroup path
      nock(apigeePrescriptionsEndpoint)
        .get(`/RequestGroup/${prescriptionId}`)
        .matchHeader("authorization", `Bearer ${apigeeAccessToken}`)
        .matchHeader("nhsd-session-urid", roleId)
        .matchHeader("nhsd-identity-uuid", roleId)
        .matchHeader("nhsd-session-jobrole", roleId)
        .matchHeader("x-request-id", "test-uuid")
        // Note: nhsd-organization-uuid and x-correlation-id are empty strings in the test
        .matchHeader("nhsd-organization-uuid", "")
        .matchHeader("x-correlation-id", "")
        .reply(200, fakeApigeeData, fakeApigeeHeaders)

      // Setup the doHSClient mock so that getDoHSData returns mapped data.
      const mockDoHSResponse = {
        prescribingOrganization: {ODSCode: "ODS_AUTHOR", OrganisationName: "Org Prescriber"},
        nominatedPerformer: {ODSCode: "ODS123456", OrganisationName: "Org Performer"},
        dispensingOrganizations: [
          {ODSCode: "ODS_DISPENSE", OrganisationName: "Org Dispenser"}
        ]
      }
      mockDoHSClient.mockImplementationOnce(() => Promise.resolve(mockDoHSResponse))

      // Make mergePrescriptionDetails return a merged object.
      const mergedResponse = {merged: true}
      mockMergePrescriptionDetails.mockReturnValue(mergedResponse)

      const result = await processPrescriptionRequest(
        event,
        apigeePrescriptionsEndpoint,
        apigeeAccessToken,
        roleId,
        "",
        "",
        logger
      )

      expect(result.statusCode).toEqual(200)
      expect(mockMergePrescriptionDetails).toHaveBeenCalled()
      expect(result.body).toEqual(JSON.stringify(mergedResponse))

      // Check that headers contain the expected content (axios returns AxiosHeaders object)
      expect(result.headers).toHaveProperty("content-type", "application/json")

      // Verify formatHeaders was called with the AxiosHeaders object
      expect(mockFormatHeaders).toHaveBeenCalled()
      const formatHeadersCall = mockFormatHeaders.mock.calls[0][0]
      expect(formatHeadersCall).toHaveProperty("content-type", "application/json")
    })

    it("should return 'Prescription details not found' if mergePrescriptionDetails throws an error", async () => {
      const prescriptionId = "RX123"
      const event: APIGatewayProxyEvent = {
        ...mockAPIGatewayProxyEvent,
        pathParameters: {prescriptionId}
      }

      const fakeApigeeData = {
        author: {
          identifier: {
            value: "ODS_AUTHOR"
          }
        },
        action: [
          {
            participant: [
              {identifier: {system: "https://fhir.nhs.uk/Id/ods-organization-code", value: "ODS123456"}}
            ]
          },
          {
            action: [
              {
                title: "Dispense notification successful",
                participant: [{identifier: {value: "ODS_DISPENSE"}}]
              }
            ]
          }
        ]
      }

      const fakeApigeeHeaders = {"content-type": "application/json"}

      // Set up nock to intercept the HTTP request - note the RequestGroup path
      nock(apigeePrescriptionsEndpoint)
        .get(`/RequestGroup/${prescriptionId}`)
        .matchHeader("authorization", `Bearer ${apigeeAccessToken}`)
        .matchHeader("nhsd-session-urid", roleId)
        .matchHeader("nhsd-identity-uuid", roleId)
        .matchHeader("nhsd-session-jobrole", roleId)
        .matchHeader("x-request-id", "test-uuid")
        .matchHeader("nhsd-organization-uuid", "")
        .matchHeader("x-correlation-id", "")
        .reply(200, fakeApigeeData, fakeApigeeHeaders)

      // Ensure doHSClient returns valid data.
      const mockDoHSResponse = {
        prescribingOrganization: {ODSCode: "ODS_AUTHOR", OrganisationName: "Org Prescriber"},
        nominatedPerformer: {ODSCode: "ODS123456", OrganisationName: "Org Performer"},
        dispensingOrganizations: [
          {ODSCode: "ODS_DISPENSE", OrganisationName: "Org Dispenser"}
        ]
      }
      mockDoHSClient.mockImplementationOnce(() => Promise.resolve(mockDoHSResponse))

      // Force mergePrescriptionDetails to throw an error.
      mockMergePrescriptionDetails.mockImplementation(() => {
        throw new Error("Merge error")
      })

      const result = await processPrescriptionRequest(
        event,
        apigeePrescriptionsEndpoint,
        apigeeAccessToken,
        roleId,
        "",
        "",
        logger
      )

      expect(result.statusCode).toEqual(200)
      const body = JSON.parse(result.body)
      expect(body).toEqual({message: "Prescription details not found"})
      expect(logger.warn).toHaveBeenCalledWith("Prescription details not found")
    })

    it("should handle prescription IDs ending with + character correctly", async () => {
      const prescriptionId = "RX123+"
      const event: APIGatewayProxyEvent = {
        ...mockAPIGatewayProxyEvent,
        pathParameters: {prescriptionId}
      }

      // Create a fake Apigee response with necessary fields.
      const fakeApigeeData = {
        author: {
          identifier: {
            value: "ODS_AUTHOR"
          }
        },
        action: [
          {
            participant: [
              {identifier: {system: "https://fhir.nhs.uk/Id/ods-organization-code", value: "ODS123456"}}
            ]
          },
          {
            action: [
              {
                title: "Dispense notification successful",
                participant: [{identifier: {value: "ODS_DISPENSE"}}]
              }
            ]
          }
        ]
      }

      const fakeApigeeHeaders = {"content-type": "application/json"}

      // Set up nock to intercept the HTTP request - the + should be properly URL encoded as %2B
      nock(apigeePrescriptionsEndpoint)
        .get("/RequestGroup/RX123%2B") // + gets URL encoded to %2B
        .matchHeader("authorization", `Bearer ${apigeeAccessToken}`)
        .matchHeader("nhsd-session-urid", roleId)
        .matchHeader("nhsd-identity-uuid", roleId)
        .matchHeader("nhsd-session-jobrole", roleId)
        .matchHeader("x-request-id", "test-uuid")
        .matchHeader("nhsd-organization-uuid", "")
        .matchHeader("x-correlation-id", "")
        .reply(200, fakeApigeeData, fakeApigeeHeaders)

      // Setup the doHSClient mock so that getDoHSData returns mapped data.
      const mockDoHSResponse = {
        prescribingOrganization: {ODSCode: "ODS_AUTHOR", OrganisationName: "Org Prescriber"},
        nominatedPerformer: {ODSCode: "ODS123456", OrganisationName: "Org Performer"},
        dispensingOrganizations: [
          {ODSCode: "ODS_DISPENSE", OrganisationName: "Org Dispenser"}
        ]
      }
      mockDoHSClient.mockImplementationOnce(() => Promise.resolve(mockDoHSResponse))

      // Make mergePrescriptionDetails return a merged object.
      const mergedResponse = {merged: true, prescriptionId}
      mockMergePrescriptionDetails.mockReturnValue(mergedResponse)

      const result = await processPrescriptionRequest(
        event,
        apigeePrescriptionsEndpoint,
        apigeeAccessToken,
        roleId,
        "",
        "",
        logger
      )

      expect(result.statusCode).toEqual(200)
      expect(mockMergePrescriptionDetails).toHaveBeenCalled()
      expect(result.body).toEqual(JSON.stringify(mergedResponse))

      // Verify that the prescription ID with + was handled correctly
      expect(logger.info).toHaveBeenCalledWith("Fetching prescription details from Apigee", {prescriptionId: "RX123+"})
    })
  })
})
