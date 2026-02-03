import {
  afterAll,
  describe,
  expect,
  it,
  vi
} from "vitest"

import {Logger} from "@aws-lambda-powertools/logger"
import {PatientSummary} from "@cpt-ui-common/common-types"

const apigeePersonalDemographicsEndpoint = process.env.apigeePersonalDemographicsEndpoint as string ?? ""
const logger: Logger = new Logger({serviceName: "getPatientDetails", logLevel: "DEBUG"})

const {
  mockGetPatientDetails,
  mockClient,
  mockWithAccessToken,
  mockWithRoleId,
  mockWithOrgCode,
  mockWithCorrelationId
} = vi.hoisted(() => {
  const mockGetPatientDetails = vi.fn()
  const mockWithCorrelationId = vi.fn().mockImplementation(() => ({
    getPatientDetails: mockGetPatientDetails
  }))
  const mockWithOrgCode = vi.fn().mockImplementation(() => ({
    with_correlation_id: mockWithCorrelationId
  }))
  const mockWithRoleId = vi.fn().mockImplementation(() => ({
    with_org_code: mockWithOrgCode
  }))
  const mockWithAccessToken = vi.fn().mockImplementation(() => ({
    with_role_id: mockWithRoleId
  }))
  const mockClient = vi.fn().mockImplementation(function () {
    return {
      with_access_token: mockWithAccessToken
    }
  })

  return {
    mockGetPatientDetails,
    mockClient,
    mockWithAccessToken,
    mockWithRoleId,
    mockWithOrgCode,
    mockWithCorrelationId
  }
})

vi.mock("@cpt-ui-common/pdsClient", () => ({
  Client: mockClient,
  patientDetails: {
    OutcomeType: {
      SUCCESS: "SUCCESS",
      SUPERSEDED: "SUPERSEDED",
      AXIOS_ERROR: "AXIOS_ERROR",
      PDS_ERROR: "PDS_ERROR",
      RESTRICTED: "RESTRICTED",
      PATIENT_NOT_FOUND: "PATIENT_NOT_FOUND",
      PARSE_ERROR: "PARSE_ERROR"
    }
  }
}))

const mockPdsPatient: PatientSummary = {
  nhsNumber: "9000000009",
  gender: "female",
  dateOfBirth: "2010-10-22",
  familyName: "Smith",
  givenName: ["Jane"],
  nameUse: "usual",
  address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
  postcode: "LS1 6AE",
  addressUse: "temp"
}

const {getPatientDetails} = await import("../src/services/getPatientDetails")

describe("Get Patient Details", () => {
  afterAll(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns patient details when PDS called successfully", async () => {
    mockGetPatientDetails.mockImplementation(() => Promise.resolve({type: "SUCCESS", patientDetails: mockPdsPatient}))
    const result = await getPatientDetails(
      "9000000009",
      apigeePersonalDemographicsEndpoint,
      {
        apigeeAccessToken: "someAccessToken",
        roleId: "someRoleId",
        orgCode: "someOrgCode",
        correlationId: "someCorelationId"
      },
      logger
    )

    const expected = {
      nhsNumber: "9000000009",
      gender: "female",
      dateOfBirth: "2010-10-22",
      familyName: "Smith",
      givenName: ["Jane"],
      nameUse: "usual",
      address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
      postcode: "LS1 6AE",
      addressUse: "temp"
    }
    expect(result).toEqual(expected)
  })

  it("returns superseded patient details when PDS returns superseded", async () => {
    const mockPatient = structuredClone(mockPdsPatient)
    mockPatient.nhsNumber = "9000000099"
    mockGetPatientDetails.mockImplementation(() => Promise.resolve(
      {type: "SUPERSEDED", patientDetails: mockPatient}))

    const result = await getPatientDetails(
      "9000000009",
      apigeePersonalDemographicsEndpoint,
      {
        apigeeAccessToken: "someAccessToken",
        roleId: "someRoleId",
        orgCode: "someOrgCode",
        correlationId: "someCorelationId"
      },
      logger
    )

    const expected = {
      nhsNumber: "9000000099",
      gender: "female",
      dateOfBirth: "2010-10-22",
      familyName: "Smith",
      givenName: ["Jane"],
      nameUse: "usual",
      address: ["1 Trevelyan Square", "Boar Lane", "City Centre", "Leeds", "West Yorkshire"],
      postcode: "LS1 6AE",
      addressUse: "temp"
    }
    expect(result).toEqual(expected)
  })

  it("returns undefined when PDS axios call errors", async () => {
    mockGetPatientDetails.mockImplementation(() => Promise.resolve({type: "AXIOS_ERROR"}))

    const result = await getPatientDetails(
      "9000000009",
      apigeePersonalDemographicsEndpoint,
      {
        apigeeAccessToken: "someAccessToken",
        roleId: "someRoleId",
        orgCode: "someOrgCode",
        correlationId: "someCorelationId"
      },
      logger
    )

    expect(result).toEqual(undefined)
  })

  it("returns undefined when PDS call fails", async () => {
    mockGetPatientDetails.mockImplementation(() => Promise.resolve({type: "PDS_ERROR"}))

    const result = await getPatientDetails(
      "9000000009",
      apigeePersonalDemographicsEndpoint,
      {
        apigeeAccessToken: "someAccessToken",
        roleId: "someRoleId",
        orgCode: "someOrgCode",
        correlationId: "someCorelationId"
      },
      logger
    )

    expect(result).toEqual(undefined)
  })

  it("throws error when PDS returns restricted", async () => {
    mockGetPatientDetails.mockImplementation(() => Promise.resolve({type: "RESTRICTED"}))

    const action = getPatientDetails(
      "9000000009",
      apigeePersonalDemographicsEndpoint,
      {
        apigeeAccessToken: "someAccessToken",
        roleId: "someRoleId",
        orgCode: "someOrgCode",
        correlationId: "someCorelationId"
      },
      logger
    )

    await expect(action).rejects.toThrow("Patient not found")
  })

  it("throws error when PDS returns not found", async () => {
    mockGetPatientDetails.mockImplementation(() => Promise.resolve({type: "PATIENT_NOT_FOUND"}))

    const action = getPatientDetails(
      "9000000009",
      apigeePersonalDemographicsEndpoint,
      {
        apigeeAccessToken: "someAccessToken",
        roleId: "someRoleId",
        orgCode: "someOrgCode",
        correlationId: "someCorelationId"
      },
      logger
    )

    await expect(action).rejects.toThrow("Patient not found")
  })

  it("throws error when PDS returns parse error", async () => {
    mockGetPatientDetails.mockImplementation(() => Promise.resolve({type: "PARSE_ERROR"}))

    const action = getPatientDetails(
      "9000000009",
      apigeePersonalDemographicsEndpoint,
      {
        apigeeAccessToken: "someAccessToken",
        roleId: "someRoleId",
        orgCode: "someOrgCode",
        correlationId: "someCorelationId"
      },
      logger
    )

    await expect(action).rejects.toThrow("PDS response invalid")
  })
})
