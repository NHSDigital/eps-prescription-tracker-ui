import {mapPdsResponseToPatientDetails} from "../../src/interactions/patientDetailsLookup/utils"

const mockPdsResponse = {
  id: "9999999999",
  name: [{
    given: ["John"],
    family: "Doe",
    prefix: ["Mr"],
    suffix: ["Jr"]
  }],
  gender: "male",
  birthDate: "1990-01-01",
  address: [{
    line: ["123 Test Street", "Apt 4B", "", "London"],
    postalCode: "SW1A 1AA"
  }]
}

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
