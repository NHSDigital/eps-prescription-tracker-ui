/* eslint-disable max-len */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest"
import nock from "nock"

import type {Logger} from "@aws-lambda-powertools/logger"
import {getDoHSData, processPrescriptionRequest} from "../src/services/prescriptionService"
import {extractOdsCodes} from "../src/utils/extensionUtils"

const {
  mockUuidV4,
  mockDoHSClient,
  mockMergePrescriptionDetails
} = vi.hoisted(() => {
  return {
    mockUuidV4: vi.fn(() => "test-uuid"),
    mockDoHSClient: vi.fn(),
    mockMergePrescriptionDetails: vi.fn()
  }
})

// Mock uuid so that it is predictable.
vi.mock("uuid", () => ({
  v4: mockUuidV4
}))

// Create a mock for the doHSClient function.
vi.mock("@cpt-ui-common/doHSClient", () => ({
  doHSClient: mockDoHSClient
}))

// Mock mergePrescriptionDetails from responseMapper.
vi.mock("../src/utils/responseMapper", () => ({
  mergePrescriptionDetails: mockMergePrescriptionDetails
}))

// Import some mock objects to use in our tests.
import {Bundle, FhirResource} from "fhir/r4"
import {PrescriptionOdsCodes} from "../src/utils/extensionUtils"

describe("prescriptionService", () => {
  let logger: Logger

  beforeEach(() => {
    vi.restoreAllMocks()
    // Clean up any pending nock interceptors
    nock.cleanAll()
    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as unknown as Logger
  })

  afterEach(() => {
    // Verify that all nock interceptors were used
    if (!nock.isDone()) {
      nock.cleanAll()
    }
  })

  describe("extractOdsCodes", () => {
    it("should extract ODS codes correctly from a valid ApigeeDataResponse", () => {
      const transformedApigeeData = {
        resourceType: "Bundle",
        entry: [
          {
            resource: {
              resourceType: "RequestGroup",
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
                  title: "Prescription status transitions",
                  action: [
                    {
                      title: "Dispense notification successful",
                      participant: [
                        {
                          extension: [
                            {
                              valueReference: {
                                identifier: {
                                  value: "ODS_DISPENSE"
                                }
                              }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          },
          {
            resource: {
              resourceType: "MedicationRequest",
              dispenseRequest: {
                performer: {
                  identifier: {
                    value: "ODS123456"
                  }
                }
              }
            }
          }
        ]
      } as unknown as Bundle<FhirResource>

      const result = extractOdsCodes(transformedApigeeData, logger)
      expect(result.prescribingOrganization).toEqual("ODS_AUTHOR")
      expect(result.nominatedPerformer).toEqual("ODS123456")
      expect(result.dispensingOrganization).toEqual("ODS_DISPENSE")

      // Verify that a log entry was made.
      expect(logger.info).toHaveBeenCalledWith(
        "Extracted ODS codes",
        expect.objectContaining({
          prescribingOrganization: "ODS_AUTHOR",
          nominatedPerformer: "ODS123456",
          dispensingOrganization: "ODS_DISPENSE"
        })
      )
    })
  })

  describe("getDoHSData", () => {
    // Prepare sample odsCodes.
    const odsCodes = {
      prescribingOrganization: "ODS123",
      nominatedPerformer: "ODS456",
      dispensingOrganization: "ODS789"
    }

    it("should return default DoHSData if no valid odsCodes are provided", async () => {
      const emptyOdsCodes = {
        prescribingOrganization: undefined,
        nominatedPerformer: undefined,
        dispensingOrganization: undefined
      } as unknown as PrescriptionOdsCodes

      const result = await getDoHSData(emptyOdsCodes, logger)
      expect(result).toEqual({
        prescribingOrganization: null,
        nominatedPerformer: null,
        dispensingOrganization: null
      })
      // doHSClient should not be called if no valid odsCodes are present.
      expect(mockDoHSClient).not.toHaveBeenCalled()
    })

    it("should return mapped DoHSData when matching ODS codes are returned", async () => {
      // Setup the mockDoHSClient to return matching data.
      const mockDoHSResponse = [
        {
          ODSCode: "ODS123",
          OrganisationName: "Org Prescriber"
        },
        {
          ODSCode: "ODS456",
          OrganisationName: "Org Performer"
        },
        {
          ODSCode: "ODS789",
          OrganisationName: "Org Dispenser"
        }
      ]
      mockDoHSClient.mockImplementationOnce(() => Promise.resolve(mockDoHSResponse))

      const result = await getDoHSData(odsCodes, logger)
      expect(result.prescribingOrganization).toEqual({
        ODSCode: "ODS123",
        OrganisationName: "Org Prescriber"
      })
      expect(result.nominatedPerformer).toEqual({
        ODSCode: "ODS456",
        OrganisationName: "Org Performer"
      })
      expect(result.dispensingOrganization).toEqual(
        {
          ODSCode: "ODS789",
          OrganisationName: "Org Dispenser"
        }
      )

      expect(logger.info).toHaveBeenCalledWith(
        "Mapped DoHS organizations",
        expect.objectContaining({
          prescribingOrganization: "Org Prescriber",
          nominatedPerformer: "Org Performer",
          dispensingOrganization: "Org Dispenser"
        })
      )
    })

    it("should return default DoHSData when ODS codes do not match", async () => {
      // Setup the mockDoHSClient to return data with non-matching ODS codes.
      const mockDoHSResponse = [
        {
          ODSCode: "MISMATCH",
          OrganisationName: "Org Prescriber"
        },
        {
          ODSCode: "MISMATCH",
          OrganisationName: "Org Performer"
        },
        {
          ODSCode: "MISMATCH",
          OrganisationName: "Org Dispenser"
        }
      ]
      mockDoHSClient.mockImplementationOnce(() => Promise.resolve(mockDoHSResponse))

      const result = await getDoHSData(odsCodes, logger)
      expect(result.prescribingOrganization).toBeNull()
      expect(result.nominatedPerformer).toBeNull()
      expect(result.dispensingOrganization).toBeNull()
    })

    it("should handle errors from doHSClient and return default DoHSData", async () => {
      mockDoHSClient.mockImplementationOnce(() => Promise.reject(new Error("API Error")))

      const result = await getDoHSData(odsCodes, logger)
      expect(result).toEqual({
        prescribingOrganization: null,
        nominatedPerformer: null,
        dispensingOrganization: null
      })
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch DoHS API data",
        expect.objectContaining({error: expect.any(Error)})
      )
    })
  })

  describe("processPrescriptionRequest", () => {
    const apigeePrescriptionsEndpoint = "https://api.example.com/"
    // Create a fake Apigee response with necessary fields.
    const participantExtensionUrl =
    "http://hl7.org/fhir/5.0/StructureDefinition/extension-RequestOrchestration.action.participant.typeReference"
    const fakeApigeeData = {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
            resourceType: "RequestGroup",
            author: {
              identifier: {
                system: "https://fhir.nhs.uk/Id/ods-organization-code",
                value: "ODS123"
              }
            },
            action: [
              {
                title: "Prescription status transitions",
                action: [{
                  participant: [{
                    extension: [{
                      valueReference: {
                        identifier: {
                          system: "https://fhir.nhs.uk/Id/ods-organization-code",
                          value: "ODS789"
                        }
                      },
                      url: participantExtensionUrl
                    }]
                  }]
                }]
              }
            ]
          }
        },
        {
          resource: {
            resourceType: "MedicationRequest",
            dispenseRequest: {
              performer: {identifier: {value: "ODS456"}}
            }
          }
        }
      ]
    }

    it("should process and return merged response when successful", async () => {
      const prescriptionId = "RX123"

      // Set up nock to intercept the HTTP request - note the RequestGroup path
      nock(apigeePrescriptionsEndpoint)
        .get(`/RequestGroup/${prescriptionId}`)
        .query({issueNumber: "1"})
        .matchHeader("a-header", `a-value`)
        .reply(200, fakeApigeeData, {"content-type": "application/json"})

      // Setup the doHSClient mock so that getDoHSData returns mapped data.
      const mockDoHSResponse = [
        {ODSCode: "ODS_AUTHOR", OrganisationName: "Org Prescriber"},
        {ODSCode: "ODS123456", OrganisationName: "Org Performer"},
        {ODSCode: "ODS_DISPENSE", OrganisationName: "Org Dispenser"}
      ]
      mockDoHSClient.mockImplementationOnce(() => Promise.resolve(mockDoHSResponse))

      // Make mergePrescriptionDetails return a merged object.
      const mergedResponse = {merged: true}
      mockMergePrescriptionDetails.mockReturnValue(mergedResponse)

      const result = await processPrescriptionRequest(
        prescriptionId,
        "1",
        apigeePrescriptionsEndpoint,
        {"a-header": "a-value"},
        logger
      )

      expect(mockMergePrescriptionDetails).toHaveBeenCalled()
      expect(result).toEqual(mergedResponse)
    })

    it("should handle prescription IDs ending with + character correctly", async () => {
      const prescriptionId = "RX123+"

      // Set up nock to intercept the HTTP request - the + should be left as is
      nock(apigeePrescriptionsEndpoint)
        .get("/RequestGroup/RX123+")
        .query({issueNumber: "1"}) // Add the query parameter that the service includes
        .matchHeader("a-header", `a-value`)
        .reply(200, fakeApigeeData, {"content-type": "application/json"})

      // Setup the doHSClient mock so that getDoHSData returns mapped data.
      const mockDoHSResponse = [
        {ODSCode: "ODS_AUTHOR", OrganisationName: "Org Prescriber"},
        {ODSCode: "ODS123456", OrganisationName: "Org Performer"},
        {ODSCode: "ODS_DISPENSE", OrganisationName: "Org Dispenser"}
      ]
      mockDoHSClient.mockImplementationOnce(() => Promise.resolve(mockDoHSResponse))

      // Make mergePrescriptionDetails return a merged object.
      const mergedResponse = {merged: true, prescriptionId}
      mockMergePrescriptionDetails.mockReturnValue(mergedResponse)

      const result = await processPrescriptionRequest(
        prescriptionId,
        "1",
        apigeePrescriptionsEndpoint,
        {"a-header": "a-value"},
        logger
      )

      expect(mockMergePrescriptionDetails).toHaveBeenCalled()
      expect(result).toEqual(mergedResponse)

      // Verify that the prescription ID with + was handled correctly
      expect(logger.info).toHaveBeenCalledWith("Fetching prescription details from Apigee", {prescriptionId: "RX123+", issueNumber: "1"})
    })
  })
})
