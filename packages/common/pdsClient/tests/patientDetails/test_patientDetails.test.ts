/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  jest,
  describe,
  it,
  expect,
  beforeEach
} from "@jest/globals"
import {mockAxiosErrorInstance, mockAxiosInstance, mockLogger} from "@cpt-ui-common/testing"
import {mockPdsPatient} from "./mockObjects"

import * as pds from "../../src"
import {PatientMetaCode, RestrictedPatient, UnrestrictedPatient} from "../../src/schema/patient"
import {PatientAddressUse, PatientNameUse} from "@cpt-ui-common/common-types"
const OutcomeType = pds.patientDetails.OutcomeType

describe("Patient Details Lookup Service Tests", () => {
  const mockEndpoint = new URL("http://test-endpoint/personal-demographics/FHIR/R4/")
  const mockNhsNumber = "9000000009"

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return a successful outcome and a parsed patient when pds returns an unrestricted patient", async () => {
    const _mockAxiosInstance = mockAxiosInstance(200, mockPdsPatient)
    const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
    const outcome = await client.getPatientDetails(mockNhsNumber)

    expect(outcome.type).toBe(OutcomeType.SUCCESS)
    expect((outcome as any).patientDetails).toEqual({
      nhsNumber: "9000000009",
      familyName: "Smith",
      givenName: ["Jane"],
      nameUse: PatientNameUse.USUAL,
      gender: "female",
      dateOfBirth: "2010-10-22",
      address: [
        "1 Trevelyan Square",
        "Boar Lane",
        "City Centre",
        "Leeds",
        "West Yorkshire"
      ],
      postcode: "LS1 6AE",
      addressUse: PatientAddressUse.TEMP
    })
  })

  it("should return a patient not found outcome when pds returns a 404 status code", async () => {
    const _mockAxiosInstance = mockAxiosInstance(404, undefined)
    const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
    const outcome = await client.getPatientDetails(mockNhsNumber)

    expect(outcome.type).toBe(OutcomeType.PATIENT_NOT_FOUND)
  })

  it("should return a patient not found outcome when pds returns no data", async () => {
    const _mockAxiosInstance = mockAxiosInstance(200, undefined)
    const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
    const outcome = await client.getPatientDetails(mockNhsNumber)

    expect(outcome.type).toBe(OutcomeType.PATIENT_NOT_FOUND)
  })

  it("should return a restricted outcome when pds returns a restricted patient", async () => {
    const mockPatient = structuredClone(mockPdsPatient) as RestrictedPatient
    mockPatient.meta.security[0].code = PatientMetaCode.RESTRICTED

    const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)
    const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
    const outcome = await client.getPatientDetails(mockNhsNumber)

    expect(outcome.type).toBe(OutcomeType.RESTRICTED)
  })

  it("should return a restricted outcome when pds returns a very restricted patient", async () => {
    const mockPatient = structuredClone(mockPdsPatient) as RestrictedPatient
    mockPatient.meta.security[0].code = PatientMetaCode.VERY_RESTRICTED

    const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)
    const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
    const outcome = await client.getPatientDetails(mockNhsNumber)

    expect(outcome.type).toBe(OutcomeType.RESTRICTED)
  })

  it("should return a superseded outcome and parsed patient when pds returned a superseded patient", async () => {
    const mockPatient = structuredClone(mockPdsPatient) as UnrestrictedPatient
    mockPatient.id = "8888888888"

    const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)
    const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
    const outcome = await client.getPatientDetails(mockNhsNumber)

    expect(outcome.type).toBe(OutcomeType.SUPERSEDED)
    expect((outcome as any).patientDetails).toEqual({
      nhsNumber: "8888888888",
      familyName: "Smith",
      givenName: ["Jane"],
      nameUse: PatientNameUse.USUAL,
      gender: "female",
      dateOfBirth: "2010-10-22",
      address: [
        "1 Trevelyan Square",
        "Boar Lane",
        "City Centre",
        "Leeds",
        "West Yorkshire"
      ],
      postcode: "LS1 6AE",
      addressUse: PatientAddressUse.TEMP
    })
  })

  it("should return a axios error outcome when an error occurs", async () => {
    const client = new pds.Client(mockAxiosErrorInstance(), mockEndpoint, mockLogger())
    const outcome = await client.getPatientDetails(mockNhsNumber)

    expect(outcome.type).toBe(OutcomeType.AXIOS_ERROR)
  })

  it("should return a pds error outcome when pds returns a non 200/404 status code", async () => {
    const _mockAxiosInstance = mockAxiosInstance(500, undefined)
    const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
    const outcome = await client.getPatientDetails(mockNhsNumber)

    expect(outcome.type).toBe(OutcomeType.PDS_ERROR)
  })

  it("should return a parse error outcome when pds returns an invalid response", async () => {
    const mockResponse = {
      resourceType: "Patient",
      id: "9000000009"
    }
    const _mockAxiosInstance = mockAxiosInstance(200, mockResponse)
    const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
    const outcome = await client.getPatientDetails(mockNhsNumber)

    expect(outcome.type).toBe(OutcomeType.PARSE_ERROR)
  })
})
