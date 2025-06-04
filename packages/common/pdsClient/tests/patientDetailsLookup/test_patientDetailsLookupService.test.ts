/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  jest,
  describe,
  it,
  expect,
  beforeEach
} from "@jest/globals"
import {mockLogger} from "@cpt-ui-common/testing"
import axios from "axios"
import {mockPdsPatient} from "./mockObjects"
import nock from "nock"

import * as pds from "../../src"
const OutcomeType = pds.patientDetailsLookup.OutcomeType
const ValidatePatientDetailsOutcomeType = pds.patientDetailsLookup.ValidatePatientDetails.OutcomeType
const axiosInstance = axios.create()

describe("Patient Details Lookup Service Tests", () => {
  const logger = mockLogger()
  const mockEndpoint = new URL("http://test-endpoint/personal-demographics/FHIR/R4/")
  const mockAccessToken = "test-token"
  const mockRoleId = "test-role"
  const mockNhsNumber = "9000000009"
  const mockPdsClient = new pds.Client(
    axiosInstance,
    mockEndpoint,
    logger
  )
    .with_access_token(mockAccessToken)
    .with_role_id(mockRoleId)

  const makeRequest = async () => {
    return await mockPdsClient.getPatientDetails(mockNhsNumber)
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should successfully fetch and map patient details", async () => {
    nock( mockEndpoint )
      .get(`/Patient/${mockNhsNumber}`)
      .reply(200, mockPdsPatient)
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

  })

  it("should handle patient not found", async () => {
    nock( mockEndpoint )
      .get(`/Patient/${mockNhsNumber}`)
      .reply(200)

    const outcome = await makeRequest()

    expect(outcome.type).toBe(OutcomeType.PATIENT_NOT_FOUND)
  })

  it("should detect and handle S-Flag", async () => {

    nock( mockEndpoint )
      .get(`/Patient/${mockNhsNumber}`)
      .reply(200, {
        ...mockPdsPatient,
        meta: {
          security: [{code: "S"}]
        }
      })
    const outcome = await makeRequest()

    expect(outcome.type).toBe(OutcomeType.S_FLAG)
  })

  it("should detect and handle R-Flag", async () => {

    nock( mockEndpoint )
      .get(`/Patient/${mockNhsNumber}`)
      .reply(200, {
        ...mockPdsPatient,
        meta: {
          security: [{code: "R"}]
        }
      })
    const outcome = await makeRequest()

    expect(outcome.type).toBe(OutcomeType.R_FLAG)
  })

  it("should handle superseded NHS numbers", async () => {
    const newNhsNumber = "8888888888"

    nock( mockEndpoint )
      .get(`/Patient/${mockNhsNumber}`)
      .reply(200, {
        ...mockPdsPatient,
        id: newNhsNumber // Different NHS number than the requested one
      })
    const outcome = await makeRequest()

    expect(outcome.type).toBe(OutcomeType.SUPERSEDED)

    expect((outcome as any).supersededBy).toBe(newNhsNumber)
  })

  it("should handle incomplete patient data", async () => {

    nock( mockEndpoint )
      .get(`/Patient/${mockNhsNumber}`)
      .reply(200, {
        id: mockNhsNumber
      // Missing name details
      })
    const outcome = await makeRequest()

    expect(outcome.type).toBe(OutcomeType.PATIENT_DETAILS_VALIDATION_ERROR)
    expect((outcome as any).error.type).toBe(ValidatePatientDetailsOutcomeType.MISSING_FIELDS)
    expect((outcome as any).error.missingFields).toEqual(["given", "family"])
  })

  it("should handle API errors", async () => {
    nock( mockEndpoint )
      .get(`/Patient/${mockNhsNumber}`)
      .reply(500)
    const outcome = await makeRequest()

    expect(outcome.type).toBe(OutcomeType.AXIOS_ERROR)
  })
})
