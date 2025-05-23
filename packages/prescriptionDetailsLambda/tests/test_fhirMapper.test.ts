import {mapIntentToPrescriptionTreatmentType} from "../src/utils/fhirMappers"

describe("mapIntentToPrescriptionTreatmentType", () => {
  it("should return 'Acute' when given 'order'", () => {
    expect(mapIntentToPrescriptionTreatmentType("order")).toBe("Acute")
  })

  it("should return 'Repeat Prescribing' when given 'instance-order'", () => {
    expect(mapIntentToPrescriptionTreatmentType("instance-order")).toBe("Repeat Prescribing")
  })

  it("should return 'Repeat Dispensing' when given 'reflex-order'", () => {
    expect(mapIntentToPrescriptionTreatmentType("reflex-order")).toBe("Repeat Dispensing")
  })

  it("should return 'Unknown' when given an unrecognized intent", () => {
    expect(mapIntentToPrescriptionTreatmentType("invalid-intent")).toBe("Unknown")
  })

  it("should return 'Unknown' when given an empty string", () => {
    expect(mapIntentToPrescriptionTreatmentType("")).toBe("Unknown")
  })
})
