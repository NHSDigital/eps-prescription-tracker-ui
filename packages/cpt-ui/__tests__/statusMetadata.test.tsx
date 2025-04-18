import {
  getStatusTagColour,
  getStatusDisplayText,
  getItemStatusTagColour,
  getItemStatusDisplayText,
  getPrescriptionTypeDisplayText
} from "@/helpers/statusMetadata"

describe("statusMetadata utility functions", () => {
  describe("getStatusTagColour", () => {
    it("returns correct colour for known codes", () => {
      expect(getStatusTagColour("0006")).toBe("green")
      expect(getStatusTagColour("0005")).toBe("red")
    })

    it("returns red for unknown codes", () => {
      expect(getStatusTagColour("9999")).toBe("red")
    })
  })

  describe("getStatusDisplayText", () => {
    it("returns correct label for known codes", () => {
      expect(getStatusDisplayText("0001")).toBe("Available to download")
    })

    it("returns Unknown for unknown codes", () => {
      expect(getStatusDisplayText("XXXX")).toBe("Unknown")
    })
  })

  describe("getItemStatusTagColour", () => {
    it("returns correct colour for known item codes", () => {
      expect(getItemStatusTagColour("0001")).toBe("green")
    })

    it("returns red for unknown item codes", () => {
      expect(getItemStatusTagColour("XXXX")).toBe("red")
    })
  })

  describe("getItemStatusDisplayText", () => {
    it("returns correct label for known item codes", () => {
      expect(getItemStatusDisplayText("0003")).toBe("Item dispensed - partial")
    })

    it("returns Unknown for unknown item codes", () => {
      expect(getItemStatusDisplayText("XXXX")).toBe("Unknown")
    })
  })

  describe("getPrescriptionTypeDisplayText", () => {
    it("formats acute types", () => {
      expect(getPrescriptionTypeDisplayText("0001")).toBe("Acute")
    })

    it("formats repeat with counts", () => {
      expect(getPrescriptionTypeDisplayText("0002", 2, 6)).toBe("Repeat 2 of 6")
    })

    it("formats eRD with counts", () => {
      expect(getPrescriptionTypeDisplayText("0003", 1, 3)).toBe("eRD 1 of 3")
    })

    it("returns simple labels for missing counts", () => {
      expect(getPrescriptionTypeDisplayText("0002")).toBe("Repeat")
      expect(getPrescriptionTypeDisplayText("0003")).toBe("eRD")
    })

    it("handles unknown codes", () => {
      expect(getPrescriptionTypeDisplayText("XXXX")).toBe("Unknown")
    })
  })
})
