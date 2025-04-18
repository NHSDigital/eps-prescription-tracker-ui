/* eslint-disable @typescript-eslint/no-explicit-any */
import {PatientDetails} from "@cpt-ui-common/common-types"

import * as pds from "../../src"

const validatePatientDetails = pds.patientDetailsLookup.ValidatePatientDetails.validate
const OutcomeType = pds.patientDetailsLookup.ValidatePatientDetails.OutcomeType

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

    const outcome = validatePatientDetails(patientDetails)

    expect(outcome.type).toBe(OutcomeType.VALID)
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

    const outcome = validatePatientDetails(patientDetails)

    expect(outcome.type).toBe(OutcomeType.VALID)
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

    const outcome = validatePatientDetails(patientDetails)

    expect(outcome.type).toBe(OutcomeType.MISSING_FIELDS)
    expect((outcome as any).missingFields).toContain("given")
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

    const outcome = validatePatientDetails(patientDetails as any)

    expect(outcome.type).toBe(OutcomeType.NOT_NULL_WHEN_NOT_PRESENT)
    expect((outcome as any).field).toBe("gender")
  })
})
