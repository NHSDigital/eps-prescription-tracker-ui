/* eslint-disable @typescript-eslint/no-explicit-any */
import {describe, it, expect} from "@jest/globals"
import {mockLogger, mockAxiosInstance, mockAxiosErrorInstance} from "@cpt-ui-common/testing"
import * as examples from "./examples/index"
import {URL} from "url"

import * as pds from "../../src"
import {PatientAddressUse, PatientNameUse} from "@cpt-ui-common/common-types"
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
        nhsNumber: "9000000009",
        familyName: "Smith",
        givenName:  ["Jane"],
        nameUse: PatientNameUse.USUAL,
        gender: "female",
        dateOfBirth: "2010-10-22",
        address:  [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        postcode: "LS1 6AE",
        addressUse: PatientAddressUse.HOME
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
          givenName: ["Jane"],
          nameUse: PatientNameUse.USUAL,
          address: [
            "1 Trevelyan Square",
            "Boar Lane",
            "City Centre",
            "Leeds",
            "West Yorkshire"
          ],
          postcode: "LS1 6AE",
          addressUse: PatientAddressUse.HOME
        },
        {
          nhsNumber: "9000000017",
          gender: "female",
          dateOfBirth: "2010-10-22",
          familyName: "Smyth",
          givenName: ["Jayne"],
          nameUse: PatientNameUse.USUAL,
          address: [
            "1 Trevelyan Square",
            "Boar Lane",
            "City Centre",
            "Leeds",
            "West Yorkshire"
          ],
          postcode: "LS1 6AE",
          addressUse: PatientAddressUse.HOME
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
        givenName: ["Jane"],
        nameUse: PatientNameUse.USUAL,
        address: [
          "1 Trevelyan Square",
          "Boar Lane",
          "City Centre",
          "Leeds",
          "West Yorkshire"
        ],
        postcode: "LS1 6AE",
        addressUse: PatientAddressUse.HOME
      }])

    })
  })
})
