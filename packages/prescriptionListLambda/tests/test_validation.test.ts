import {describe, it, expect} from "@jest/globals"
import {validateSearchParams, ValidationError} from "../src/utils/validation"

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
  })
})
