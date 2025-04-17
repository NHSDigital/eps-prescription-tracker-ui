/* eslint-disable @typescript-eslint/no-explicit-any */
import {describe, it, expect} from "@jest/globals"

import * as pds from "@cpt-ui-common/pdsClient"

const Postcode = pds.patientSearch.types.Postcode
const OutcomeType = pds.patientSearch.types.PostcodeFromStringOutcomeType

describe("PostCodeFromString Tests", () => {

  it("Should return a valid postcode", () => {
    const _postcode = Postcode.from_string("AB12 3CD")

    expect(_postcode.type).toBe(OutcomeType.OK)
    expect((_postcode as any).postcode.to_query_string()).toBe("AB12%203CD")
  })

  it("Should url encode spaces and wildcards", () => {
    const _postcode = Postcode.from_string("AB*2 3CD")

    expect(_postcode.type).toBe(OutcomeType.OK)
    expect((_postcode as any).postcode.to_query_string()).toBe("AB%2A2%203CD")
  })

  it("Should return an error when postcode starts with a wildcard", () => {
    const _postcode = Postcode.from_string("*1234")

    expect(_postcode.type).toBe(OutcomeType.WILDCARD_TOO_SOON)
  })

  it("Should return an error when postcode has a wildcard in the second position", () => {
    const _postcode = Postcode.from_string("1*234")

    expect(_postcode.type).toBe(OutcomeType.WILDCARD_TOO_SOON)
  })

})
