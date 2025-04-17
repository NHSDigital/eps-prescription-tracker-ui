/* eslint-disable @typescript-eslint/no-explicit-any */
import {describe, it, expect} from "@jest/globals"

import * as pds from "@cpt-ui-common/pdsClient"

const dateOfBirth = pds.patientSearch.types.dateOfBirth
const OutcomeType = pds.patientSearch.types.DateOfBirthFromStringOutcomeType

describe("DateOfBirthFromString Tests", () => {
  it("Should return a valid date of birth", () => {
    const _dateOfBirth = dateOfBirth.from_string("1990-01-01")

    expect(_dateOfBirth.type).toBe(OutcomeType.OK)
    expect((_dateOfBirth as any).dateOfBirth.to_query_string()).toBe("1990-01-01")
  })

  it("Should return an error when date of birth is not correctly formatted", () => {
    const _dateOfBirth = dateOfBirth.from_string("01-01-1990")

    expect(_dateOfBirth.type).toBe(OutcomeType.BAD_FORMAT)
  })

  it("Should return an error when date of birth is invalid", () => {
    const _dateOfBirth = dateOfBirth.from_string("1990-02-50")

    expect(_dateOfBirth.type).toBe(OutcomeType.INVALID_DATE)
  })
})
