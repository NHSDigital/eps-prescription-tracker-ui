/* eslint-disable @typescript-eslint/no-explicit-any */
import {describe, it, expect} from "@jest/globals"

import * as pds from "@cpt-ui-common/pdsClient"

const FamilyName = pds.patientSearch.types.FamilyName
const OutcomeType = pds.patientSearch.types.FamilyNameFromStringOutcomeType

describe("FamilyNameFromString Tests", () => {
  it("Should return a valid family name", () => {
    const _familyName = FamilyName.from_string("Doe")

    expect(_familyName.type).toBe(OutcomeType.OK)
    expect((_familyName as any).familyName.to_query_string()).toBe("Doe")
  })

  it("Should url encode spaces and wildcards", () => {
    const _familyName = FamilyName.from_string("Sm*th Doe")

    expect(_familyName.type).toBe(OutcomeType.OK)
    expect((_familyName as any).familyName.to_query_string()).toBe("Sm%2Ath%20Doe")
  })

  it("Should return an error when family name is too long", () => {
    const _familyName = FamilyName.from_string("1234567890123456789012345678901234567890")

    expect(_familyName.type).toBe(OutcomeType.TOO_LONG)
  })

  it("Should return an error when family name starts with a wildcard", () => {
    const _familyName = FamilyName.from_string("*Doe")

    expect(_familyName.type).toBe(OutcomeType.WILDCARD_TOO_SOON)
  })

  it("Should return an error when family name has a wildcard in the second position", () => {
    const _familyName = FamilyName.from_string("D*oe")

    expect(_familyName.type).toBe(OutcomeType.WILDCARD_TOO_SOON)
  })
})
