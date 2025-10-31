/* eslint-disable @typescript-eslint/no-explicit-any */
import {describe, it, expect} from "@jest/globals"
import {mockLogger, mockAxiosInstance, mockAxiosErrorInstance} from "@cpt-ui-common/testing"
import * as examples from "./examples/index"
import {URL} from "url"

import * as pds from "../../src"
import {
  PatientAddressUse,
  PatientNameUse,
  SuccessfulResponse,
  UnrestrictedPatientResource
} from "../../src/interactions/patientSearch/schema"
const OutcomeType = pds.patientSearch.OutcomeType

describe("PatientSearch Unit Tests", () => {
  const mockEndpoint = new URL("https://example.com/FHIR/R4/")
  describe("Input Validation", () => {
    const client = new pds.Client(mockAxiosInstance(200, undefined), mockEndpoint, mockLogger())

    it("Should return an invalid parameters outcome when given an invalid family name", async () => {
      const outcome = await client.patientSearch("a*", "1234-01-01", "testPostcode")

      expect(outcome.type).toBe(OutcomeType.INVALID_PARAMETERS)
      expect((outcome as any).validationErrors).toEqual([{
        name: "familyName",
        error: "Wildcard cannot be in first 2 characters"
      }])
    })

    it("Should return an invalid parameters outcome when given an invalid date of birth", async () => {
      const outcome = await client.patientSearch("testFamilyName", "123-401-01", "testPostcode")

      expect(outcome.type).toBe(OutcomeType.INVALID_PARAMETERS)
      expect((outcome as any).validationErrors).toEqual([{
        name: "dateOfBirth",
        error: "Date of birth must be in YYYY-MM-DD format"
      }])
    })

    it("Should return an invalid parameters outcome when given an invalid postcode", async () => {
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "**")

      expect(outcome.type).toBe(OutcomeType.INVALID_PARAMETERS)
      expect((outcome as any).validationErrors).toEqual([{
        name: "postcode",
        error: "Wildcard cannot be in first 2 characters"
      }])
    })

    it("Should return an invalid parameters outcome when given an invalid givenName", async () => {
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode", "a*")

      expect(outcome.type).toBe(OutcomeType.INVALID_PARAMETERS)
      expect((outcome as any).validationErrors).toEqual([{
        name: "givenName",
        error: "Wildcard cannot be in first 2 characters"
      }])
    })
  })

  describe("Query parameter encoding", () => {
    it("Should encode query parameters correctly", async () => {
      const axiosInstance = mockAxiosInstance(200, undefined)

      const client = new pds.Client(axiosInstance, mockEndpoint, mockLogger())
      await client.patientSearch("test Family*Name", "1234-01-01", "test Postcode*", "test Given*Name")

      expect(axiosInstance.get).toHaveBeenCalledWith(
        "https://example.com/FHIR/R4/Patient" +
        "?family=test+Family%2AName" +
        "&birthdate=eq1234-01-01" +
        "&address-postalcode=test+Postcode%2A" +
        "&given=test+Given%2AName",
        expect.any(Object)
      )
    })
  })

  describe("Axios response handling", () => {
    it("Should handle an axios error", async () => {
      const client = new pds.Client(mockAxiosErrorInstance(), mockEndpoint, mockLogger())

      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect(outcome.type).toBe(OutcomeType.AXIOS_ERROR)
    })

    it("Should handle a pds error response", async () => {
      const _mockAxiosInstance = mockAxiosInstance(400, undefined)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())

      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect(outcome.type).toBe(OutcomeType.PDS_ERROR)
    })

    it("Should correctly map a single patient", async () => {
      const _mockAxiosInstance = mockAxiosInstance(200, examples.single_patient)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect(outcome.type).toBe(OutcomeType.SUCCESS)
      expect((outcome as any).patients).toEqual([{
        "nhsNumber": "9000000009",
        "familyName": "Smith",
        "givenName":  [
          "Jane"
        ],
        "gender": "female",
        "dateOfBirth": "2010-10-22",
        "address":  [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        "postcode": "LS1 6AE"
      }])
    })

    it("Should correctly map two patients", async () => {
      const _mockAxiosInstance = mockAxiosInstance(200, examples.two_patients)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect(outcome.type).toBe(OutcomeType.SUCCESS)
      expect((outcome as any).patients).toEqual([
        {
          nhsNumber: "9000000009",
          gender: "female",
          dateOfBirth: "2010-10-22",
          familyName: "Smith",
          givenName: [ "Jane" ],
          address: [
            "1 Trevelyan Square",
            "Boar Lane",
            "City Centre",
            "Leeds",
            "West Yorkshire"
          ],
          postcode: "LS1 6AE"
        },
        {
          nhsNumber: "9000000017",
          gender: "female",
          dateOfBirth: "2010-10-22",
          familyName: "Smyth",
          givenName: [ "Jayne" ],
          address: [
            "1 Trevelyan Square",
            "Boar Lane",
            "City Centre",
            "Leeds",
            "West Yorkshire"
          ],
          postcode: "LS1 6AE"
        }
      ])
    })

    it("Should handle a response with no patients", async () => {
      const _mockAxiosInstance = mockAxiosInstance(200, examples.no_patients)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect(outcome.type).toBe(OutcomeType.SUCCESS)
      expect((outcome as any).patients).toEqual([])
    })

    it("Should handle a too many matches response", async () => {
      const _mockAxiosInstance = mockAxiosInstance(200, examples.too_many_matches)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect(outcome.type).toBe(OutcomeType.TOO_MANY_MATCHES)
    })

    it("Should filter out restricted patients", async () => {
      const _mockAxiosInstance = mockAxiosInstance(200, examples.single_restricted)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect(outcome.type).toBe(OutcomeType.SUCCESS)
      expect((outcome as any).patients).toEqual([])
    })

    it("Should handle a response with restricted and unrestricted patients", async () => {
      const _mockAxiosInstance = mockAxiosInstance(200, examples.multiple_with_restricted)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect(outcome.type).toBe(OutcomeType.SUCCESS)
      expect((outcome as any).patients).toEqual([{
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "Smith",
        givenName: [
          "Jane"
        ],
        address: [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        postcode: "LS1 6AE"
      }])

    })

    it("should handle a patient with a missing address field", async () =>{
      const mockPatient = structuredClone(examples.single_patient)
      const resource = mockPatient.entry[0].resource as UnrestrictedPatientResource
      delete resource.address
      const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect((outcome as any).patients).toEqual([{
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "Smith",
        givenName:  [
          "Jane"
        ],
        address: "n/a",
        postcode: "n/a"
      }])
    })

    it("should handle a patient with an empty address field", async () =>{
      const mockPatient = structuredClone(examples.single_patient)
      mockPatient.entry[0].resource.address = []
      const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect((outcome as any).patients).toEqual([{
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "Smith",
        givenName:  [
          "Jane"
        ],
        address: "n/a",
        postcode: "n/a"
      }])
    })

    // TODO: AEA-5926 - tests for temp addresses, both active and inactive

    it("should handle a patient without a home address", async () =>{
      const mockPatient = structuredClone(examples.single_patient)
      mockPatient.entry[0].resource.address[0].use = PatientAddressUse.TEMP
      const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect((outcome as any).patients).toEqual([{
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "Smith",
        givenName:  [
          "Jane"
        ],
        address: "n/a",
        postcode: "n/a"
      }])
    })

    it("should handle a patient with a missing address line", async () =>{
      const mockPatient = structuredClone(examples.single_patient)
      const resource = mockPatient.entry[0].resource as UnrestrictedPatientResource
      delete resource?.address?.[0].line
      const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect((outcome as any).patients).toEqual([{
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "Smith",
        givenName:  [
          "Jane"
        ],
        address: "n/a",
        postcode: "LS1 6AE"
      }])
    })

    it("should handle a patient with a missing postcode", async () =>{
      const mockPatient = structuredClone(examples.single_patient)
      const resource = mockPatient.entry[0].resource as UnrestrictedPatientResource
      delete resource?.address?.[0].postalCode
      const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect((outcome as any).patients).toEqual([{
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "Smith",
        givenName:  [
          "Jane"
        ],
        address:  [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        postcode: "n/a"
      }])
    })

    it("should handle a patient with as missing name field", async () =>{
      const mockPatient = structuredClone(examples.single_patient)
      const resource = mockPatient.entry[0].resource as unknown as UnrestrictedPatientResource
      delete resource.name
      const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect((outcome as any).patients).toEqual([{
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "n/a",
        givenName: "n/a",
        address:  [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        postcode: "LS1 6AE"
      }])
    })

    it("should handle a patient with an empty name field", async () =>{
      const mockPatient = structuredClone(examples.single_patient)
      mockPatient.entry[0].resource.name = []
      const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect((outcome as any).patients).toEqual([{
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "n/a",
        givenName: "n/a",
        address:  [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        postcode: "LS1 6AE"
      }])
    })

    it("should handle a patient without a usual name", async () =>{
      const mockPatient = structuredClone(examples.single_patient)
      mockPatient.entry[0].resource.name[0].use = PatientNameUse.TEMP
      const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect((outcome as any).patients).toEqual([{
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "n/a",
        givenName: "n/a",
        address:  [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        postcode: "LS1 6AE"
      }])
    })

    it("should handle a patient with a missing family name", async () =>{
      const mockPatient = structuredClone(examples.single_patient)
      const resource = mockPatient.entry[0].resource as unknown as UnrestrictedPatientResource
      delete resource?.name?.[0].family
      const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect((outcome as any).patients).toEqual([{
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "n/a",
        givenName:  [
          "Jane"
        ],
        address:  [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        postcode: "LS1 6AE"
      }])
    })

    it("should handle a patient with a missing given name", async () =>{
      const mockPatient = structuredClone(examples.single_patient)
      const resource = mockPatient.entry[0].resource as unknown as UnrestrictedPatientResource
      delete resource?.name?.[0].given
      const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect((outcome as any).patients).toEqual([{
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "2010-10-22",
        familyName: "Smith",
        givenName: "n/a",
        address:  [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        postcode: "LS1 6AE"
      }])
    })

    it("should handle a patient with a missing dob", async () => {
      const mockPatient = structuredClone(examples.single_patient)
      const resource = mockPatient.entry[0].resource as unknown as UnrestrictedPatientResource
      delete resource.birthDate
      const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect((outcome as any).patients).toEqual([{
        nhsNumber: "9000000009",
        gender: "female",
        dateOfBirth: "n/a",
        familyName: "Smith",
        givenName:  [
          "Jane"
        ],
        address:  [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        postcode: "LS1 6AE"
      }])
    })

    it("should handle a patient with a missing gender", async () => {
      const mockPatient = structuredClone(examples.single_patient) as unknown as SuccessfulResponse
      delete mockPatient.entry[0].resource.gender
      const _mockAxiosInstance = mockAxiosInstance(200, mockPatient)

      const client = new pds.Client(_mockAxiosInstance, mockEndpoint, mockLogger())
      const outcome = await client.patientSearch("testFamilyName", "1234-01-01", "testPostcode")

      expect((outcome as any).patients).toEqual([{
        nhsNumber: "9000000009",
        gender: "n/a",
        dateOfBirth: "2010-10-22",
        familyName: "Smith",
        givenName:  [
          "Jane"
        ],
        address:  [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        postcode: "LS1 6AE"
      }])
    })
  })
})
