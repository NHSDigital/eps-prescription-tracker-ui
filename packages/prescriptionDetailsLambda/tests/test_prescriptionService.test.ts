/* eslint-disable max-len */
import {jest} from "@jest/globals"
import nock from "nock"

import type {Logger} from "@aws-lambda-powertools/logger"

// Mock uuid so that it is predictable.
jest.unstable_mockModule("uuid", () => ({
  v4: jest.fn(() => "test-uuid")
}))

// Create a mock for the doHSClient function.
const mockDoHSClient = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/doHSClient", () => ({
  doHSClient: mockDoHSClient
}))

const mockGetPatient = jest.fn()
jest.unstable_mockModule("../src/services/getPatientDetails", () => ({
  getPatientDetails: mockGetPatient
}))

// Mock mergePrescriptionDetails from responseMapper.
const mockMergePrescriptionDetails = jest.fn()
jest.unstable_mockModule("../src/utils/responseMapper", () => ({
  mergePrescriptionDetails: mockMergePrescriptionDetails
}))

// Needed to avoid issues with ESM imports in jest
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => ({
  authParametersFromEnv: jest.fn(),
  buildApigeeHeaders: jest.fn().mockImplementation(() => ({
    Authorization: `Bearer someAccessToken`
  })),
  authenticationMiddleware: () => ({before: () => {}})
}))

// Import some mock objects to use in our tests.
import {Bundle, FhirResource} from "fhir/r4"
import {PrescriptionOdsCodes} from "../src/utils/extensionUtils"
import {
  PatientAddressUse,
  PatientNameUse,
  PatientSummary,
  PatientSummaryGender
} from "@cpt-ui-common/common-types"

const {
  getDoHSData,
  processPrescriptionRequest
} = await import("../src/services/prescriptionService")

const {
  extractOdsCodes
} = await import("../src/utils/extensionUtils")

const mockPatient: PatientSummary = {
  nhsNumber: "9999999999",
  gender: PatientSummaryGender.MALE,
  dateOfBirth: "1990-01-01",
  familyName: "Doe",
  givenName: ["John"],
  nameUse: PatientNameUse.USUAL,
  address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
  postcode: "LS1 6AE",
  addressUse: PatientAddressUse.HOME
}

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
    const prescriptionsEndpoint = "https://api.example.com/"
    const personalDemographicsEndpoint = "https://api.example.com/"
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
        },
        {
          fullUrl: "urn:uuid:PATIENT-123-567-890",
          search: {
            mode: "include"
          },
          resource: {
            resourceType: "Patient",
            identifier: [{
              system: "https://fhir.nhs.uk/Id/nhs-number",
              value: "9999999999"
            }],
            name: [{
              given: ["John"],
              family: "Doe"
            }]
          }
        }
      ]
    }

    it("should process and return merged response when successful", async () => {
      const prescriptionId = "RX123"

      // Set up nock to intercept the HTTP request - note the RequestGroup path
      nock(prescriptionsEndpoint)
        .get(`/RequestGroup/${prescriptionId}`)
        .query({issueNumber: "1"})
        .matchHeader("authorization", "Bearer someAccessToken")
        .reply(200, fakeApigeeData, {"content-type": "application/json"})

      // Setup the doHSClient mock so that getDoHSData returns mapped data.
      const mockDoHSResponse = [
        {ODSCode: "ODS_AUTHOR", OrganisationName: "Org Prescriber"},
        {ODSCode: "ODS123456", OrganisationName: "Org Performer"},
        {ODSCode: "ODS_DISPENSE", OrganisationName: "Org Dispenser"}
      ]
      mockDoHSClient.mockImplementationOnce(() => Promise.resolve(mockDoHSResponse))

      mockGetPatient.mockImplementation(() => Promise.resolve(mockPatient))

      // Make mergePrescriptionDetails return a merged object.
      const mergedResponse = {merged: true, patientDetails: {nhsNumber: "9999999999"}, patientFallback: true}
      mockMergePrescriptionDetails.mockReturnValue(mergedResponse)

      const result = await processPrescriptionRequest(
        prescriptionId,
        "1",
        {prescriptionsEndpoint, personalDemographicsEndpoint},
        {
          apigeeAccessToken: "someAccessToken",
          roleId: "someRoleId",
          orgCode: "someOrgCode",
          correlationId: "someCorelationId"
        },
        logger
      )

      expect(mockMergePrescriptionDetails).toHaveBeenCalled()
      expect(result).toEqual(mergedResponse)
    })

    it("should handle prescription IDs ending with + character correctly", async () => {
      const prescriptionId = "RX123+"

      // Set up nock to intercept the HTTP request - the + should be left as is
      nock(prescriptionsEndpoint)
        .get("/RequestGroup/RX123+")
        .query({issueNumber: "1"}) // Add the query parameter that the service includes
        .matchHeader("authorization", "Bearer someAccessToken")
        .reply(200, fakeApigeeData, {"content-type": "application/json"})

      // Setup the doHSClient mock so that getDoHSData returns mapped data.
      const mockDoHSResponse = [
        {ODSCode: "ODS_AUTHOR", OrganisationName: "Org Prescriber"},
        {ODSCode: "ODS123456", OrganisationName: "Org Performer"},
        {ODSCode: "ODS_DISPENSE", OrganisationName: "Org Dispenser"}
      ]
      mockDoHSClient.mockImplementationOnce(() => Promise.resolve(mockDoHSResponse))

      // Make mergePrescriptionDetails return a merged object.
      const mergedResponse = {merged: true, prescriptionId, patientDetails: {nhsNumber: "9999999999"}, patientFallback: true}
      mockMergePrescriptionDetails.mockReturnValue(mergedResponse)

      const result = await processPrescriptionRequest(
        prescriptionId,
        "1",
        {prescriptionsEndpoint, personalDemographicsEndpoint},
        {
          apigeeAccessToken: "someAccessToken",
          roleId: "someRoleId",
          orgCode: "someOrgCode",
          correlationId: "someCorelationId"
        },
        logger
      )

      expect(mockMergePrescriptionDetails).toHaveBeenCalled()
      expect(result).toEqual(mergedResponse)

      // Verify that the prescription ID with + was handled correctly
      expect(logger.info).toHaveBeenCalledWith("Fetching prescription details from Apigee", {prescriptionId: "RX123+", issueNumber: "1"})
    })

    it("should override patient details when PDS returns details", async () => {
      const prescriptionId = "RX123+"

      // Set up nock to intercept the HTTP request - the + should be left as is
      nock(prescriptionsEndpoint)
        .get("/RequestGroup/RX123+")
        .query({issueNumber: "1"}) // Add the query parameter that the service includes
        .matchHeader("authorization", "Bearer someAccessToken")
        .reply(200, fakeApigeeData, {"content-type": "application/json"})

      // Setup the doHSClient mock so that getDoHSData returns mapped data.
      const mockDoHSResponse = [
        {ODSCode: "ODS_AUTHOR", OrganisationName: "Org Prescriber"},
        {ODSCode: "ODS123456", OrganisationName: "Org Performer"},
        {ODSCode: "ODS_DISPENSE", OrganisationName: "Org Dispenser"}
      ]
      mockDoHSClient.mockImplementationOnce(() => Promise.resolve(mockDoHSResponse))

      mockGetPatient.mockImplementation(() => mockPatient)

      // Make mergePrescriptionDetails return a merged object.
      const mergedResponse = {
        merged: true, prescriptionId,
        patientDetails: {
          nhsNumber: "9999999999",
          familyName: "prescriptionFamily",
          givenName: ["prescriptionGiven"]
        },
        patientFallback: true
      }
      mockMergePrescriptionDetails.mockReturnValue(mergedResponse)

      const result = await processPrescriptionRequest(
        prescriptionId,
        "1",
        {prescriptionsEndpoint, personalDemographicsEndpoint},
        {
          apigeeAccessToken: "someAccessToken",
          roleId: "someRoleId",
          orgCode: "someOrgCode",
          correlationId: "someCorelationId"
        },
        logger
      )
      const expected = {
        merged: true, prescriptionId,
        patientDetails: {
          nhsNumber: "9999999999",
          gender: "male",
          dateOfBirth: "1990-01-01",
          familyName: "Doe",
          givenName: ["John"],
          nameUse: "usual",
          address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
          postcode: "LS1 6AE",
          addressUse: "home"
        },
        patientFallback: false
      }
      expect(mockMergePrescriptionDetails).toHaveBeenCalled()
      expect(result).toEqual(expected)
    })

    it("should not override patient details when PDS call fails", async () => {
      const prescriptionId = "RX123+"

      // Set up nock to intercept the HTTP request - the + should be left as is
      nock(prescriptionsEndpoint)
        .get("/RequestGroup/RX123+")
        .query({issueNumber: "1"}) // Add the query parameter that the service includes
        .matchHeader("authorization", "Bearer someAccessToken")
        .reply(200, fakeApigeeData, {"content-type": "application/json"})

      // Setup the doHSClient mock so that getDoHSData returns mapped data.
      const mockDoHSResponse = [
        {ODSCode: "ODS_AUTHOR", OrganisationName: "Org Prescriber"},
        {ODSCode: "ODS123456", OrganisationName: "Org Performer"},
        {ODSCode: "ODS_DISPENSE", OrganisationName: "Org Dispenser"}
      ]
      mockDoHSClient.mockImplementationOnce(() => Promise.resolve(mockDoHSResponse))

      mockGetPatient.mockImplementation(() => undefined)

      // Make mergePrescriptionDetails return a merged object.
      const mergedResponse = {
        merged: true, prescriptionId,
        patientDetails: {
          nhsNumber: "9999999999",
          familyName: "prescriptionFamily",
          givenName: ["prescriptionGiven"]
        },
        patientFallback: true
      }
      mockMergePrescriptionDetails.mockReturnValue(mergedResponse)

      const result = await processPrescriptionRequest(
        prescriptionId,
        "1",
        {prescriptionsEndpoint, personalDemographicsEndpoint},
        {
          apigeeAccessToken: "someAccessToken",
          roleId: "someRoleId",
          orgCode: "someOrgCode",
          correlationId: "someCorelationId"
        },
        logger
      )
      expect(mockMergePrescriptionDetails).toHaveBeenCalled()
      expect(result).toEqual(mergedResponse)
    })
  })
})
