import {describe, it, expect} from "@jest/globals"
import {validateSearchParams, validatePatientDetails, ValidationError} from "../src/utils/validation"
import {PDSError} from "../src/utils/errors"
import {PatientDetails} from "../src/types"

describe("Validation Utils Tests", () => {
  describe("validateSearchParams", () => {
    it("should validate with valid prescription ID", () => {
      const params = {prescriptionId: "8B45A9-A83008-6F7A8L"}
      expect(() => validateSearchParams(params)).not.toThrow()
    })

    it("should validate with valid NHS number", () => {
      const params = {nhsNumber: "9434765870"} // Valid NHS number with correct checksum
      expect(() => validateSearchParams(params)).not.toThrow()
    })

    it("should throw error when both parameters are missing", () => {
      const params = {}
      expect(() => validateSearchParams(params)).toThrow(ValidationError)
      expect(() => validateSearchParams(params)).toThrow("Either prescriptionId or nhsNumber must be provided")
    })

    it("should throw error when both parameters are provided", () => {
      const params = {prescriptionId: "8B45A9-A83008-6F7A8L", nhsNumber: "9434765870"}
      expect(() => validateSearchParams(params)).toThrow(ValidationError)
      expect(() => validateSearchParams(params)).toThrow("Cannot search by both prescriptionId and nhsNumber")
    })

    it.skip("should throw error for invalid NHS number format", () => {
      const params = {nhsNumber: "123456"} // Too short
      expect(() => validateSearchParams(params)).toThrow(ValidationError)
      expect(() => validateSearchParams(params)).toThrow("Invalid NHS number format")
    })

    it.skip("should throw error for invalid prescription ID format", () => {
      const params = {prescriptionId: "8B45A9-A83008"} // No numeric prefix
      expect(() => validateSearchParams(params)).toThrow(ValidationError)
      expect(() => validateSearchParams(params)).toThrow("Invalid prescription ID format")
    })
  })

  describe("validatePatientDetails", () => {
    it("should validate complete patient details", () => {
      const patientDetails: PatientDetails = {
        nhsNumber: "9999999999",
        given: "John",
        family: "Doe",
        prefix: "Mr",
        suffix: "",
        gender: "male",
        dateOfBirth: "1990-01-01",
        address: {
          line1: "123 Test St",
          city: "London",
          postcode: "SW1A 1AA"
        }
      }

      expect(() => validatePatientDetails(patientDetails)).not.toThrow()
    })

    it("should validate patient details with minimal required fields", () => {
      const patientDetails: PatientDetails = {
        nhsNumber: "9999999999",
        given: "John",
        family: "Doe",
        prefix: "",
        suffix: "",
        gender: null,
        dateOfBirth: null,
        address: null
      }

      expect(() => validatePatientDetails(patientDetails)).not.toThrow()
    })

    it("should throw error for missing required fields", () => {
      const patientDetails: PatientDetails = {
        nhsNumber: "9999999999",
        given: "", // Missing given name
        family: "Doe",
        prefix: "",
        suffix: "",
        gender: null,
        dateOfBirth: null,
        address: null
      }

      expect(() => validatePatientDetails(patientDetails)).toThrow(PDSError)
      expect(() => validatePatientDetails(patientDetails)).toThrow(/Incomplete patient information/)
    })

    it("should throw error when optional fields are undefined instead of null", () => {
      const patientDetails = {
        nhsNumber: "9999999999",
        given: "John",
        family: "Doe",
        prefix: "",
        suffix: "",
        gender: undefined, // Should be null, not undefined
        dateOfBirth: null,
        address: null
      }

      expect(() => validatePatientDetails(patientDetails as unknown as PatientDetails)).toThrow(PDSError)
    })
  })
})
