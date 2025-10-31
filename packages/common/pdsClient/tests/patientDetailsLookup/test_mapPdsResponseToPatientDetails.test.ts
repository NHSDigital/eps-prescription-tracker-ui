import {PatientSummaryGender} from "@cpt-ui-common/common-types"
import {PDSResponse} from "../../src/interactions/patientDetailsLookup/types"
import {mapPdsResponseToPatientDetails} from "../../src/interactions/patientDetailsLookup/utils"
import {PatientAddressUse} from "../../src/interactions/patientSearch/schema"

const mockPdsResponse: PDSResponse = {
  id: "9999999999",
  name: [{
    given: ["John"],
    family: "Doe"
  }],
  gender: PatientSummaryGender.MALE,
  birthDate: "1990-01-01",
  address: [{
    line: ["123 Test Street", "Apt 4B", "", "London"],
    postalCode: "SW1A 1AA",
    use: PatientAddressUse.HOME
  }]
}

// TODO: AEA-5926 - fix tests
// TODO: AEA-5926 - add tests for not available fields
// TODO: AEA-5926 - add tests for temp addresses

describe("mapPdsResponseToPatientDetails", () => {
  it("should correctly map PDS response to PatientDetails", () => {
    const result = mapPdsResponseToPatientDetails(mockPdsResponse)

    expect(result).toEqual({
      nhsNumber: "9999999999",
      given: "John",
      family: "Doe",
      prefix: "Mr",
      suffix: "Jr",
      gender: "male",
      dateOfBirth: "1990-01-01",
      address: {
        line1: "123 Test Street",
        line2: "Apt 4B",
        city: "London",
        postcode: "SW1A 1AA"
      }
    })
  })

  it("should handle missing optional fields", () => {
    const minimalPdsResponse = {
      id: "9999999999",
      name: [{
        given: ["John"],
        family: "Doe"
      }]
    }

    const result = mapPdsResponseToPatientDetails(minimalPdsResponse)

    expect(result).toEqual({
      nhsNumber: "9999999999",
      given: "John",
      family: "Doe",
      prefix: "",
      suffix: "",
      gender: null,
      dateOfBirth: null,
      address: null
    })
  })
})
