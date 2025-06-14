/* eslint-disable @typescript-eslint/no-explicit-any */
import {describe, it, expect} from "@jest/globals"

import * as pds from "../../../src"

const Name = pds.patientSearch.types.Name
const OutcomeType = pds.patientSearch.types.NameFromStringOutcomeType

describe("NameFromString Tests", () => {
  it("Should return a valid name", () => {
    const _Name = Name.from_string("Doe")

    expect(_Name.type).toBe(OutcomeType.OK)
    expect((_Name as any).Name.to_string()).toBe("Doe")
  })

  it("Should return an error when name is too long", () => {
    const _Name = Name.from_string("1234567890123456789012345678901234567890")

    expect(_Name.type).toBe(OutcomeType.TOO_LONG)
  })

  it("Should return an error when name starts with a wildcard", () => {
    const _Name = Name.from_string("*Doe")

    expect(_Name.type).toBe(OutcomeType.WILDCARD_TOO_SOON)
  })

  it("Should return an error when name has a wildcard in the second position", () => {
    const _Name = Name.from_string("D*oe")

    expect(_Name.type).toBe(OutcomeType.WILDCARD_TOO_SOON)
  })
})
