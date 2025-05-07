import {
  getStatusTagColour,
  getStatusDisplayText,
  getItemStatusTagColour,
  getItemStatusDisplayText,
  getPrescriptionTypeDisplayText
} from "@/helpers/statusMetadata"

import {STATUS_LABELS} from "@/constants/ui-strings/StatusLabels"

describe("Status Metadata Utility Functions", () => {
  describe("getStatusTagColour", () => {
    it.each(Object.keys(STATUS_LABELS.prescription))(
      "returns a defined colour for known prescription status code %s",
      (code) => {
        const result = getStatusTagColour(code)
        expect(result).not.toBe("red") // red is default return
        expect(typeof result).toBe("string")
      }
    )

    it.each(["", "UNKNOWN", "9999"])("returns red for unknown code %s", (code) => {
      expect(getStatusTagColour(code)).toBe("red")
    })
  })

  describe("getStatusDisplayText", () => {
    it.each(Object.entries(STATUS_LABELS.prescription))(
      "returns label '%s' for prescription status code %s",
      (code, expectedLabel) => {
        expect(getStatusDisplayText(code)).toBe(expectedLabel)
      }
    )

    it.each(["", "UNKNOWN", "9999"])("returns 'Unknown' for unknown code %s", (code) => {
      expect(getStatusDisplayText(code)).toBe("Unknown")
    })
  })

  describe("getItemStatusTagColour", () => {
    it.each(Object.keys(STATUS_LABELS.item))(
      "returns a defined colour for known item status code %s",
      (code) => {
        const result = getItemStatusTagColour(code)
        expect(result).not.toBe("red") // red is default return
        expect(typeof result).toBe("string")
      }
    )

    it.each(["", "UNKNOWN", "9999"])("returns red for unknown code %s", (code) => {
      expect(getItemStatusTagColour(code)).toBe("red")
    })
  })

  describe("getItemStatusDisplayText", () => {
    it.each(Object.entries(STATUS_LABELS.item))(
      "returns label '%s' for item status code %s",
      (code, expectedLabel) => {
        expect(getItemStatusDisplayText(code)).toBe(expectedLabel)
      }
    )

    it.each(["", "UNKNOWN", "9999"])("returns 'Unknown' for unknown code %s", (code) => {
      expect(getItemStatusDisplayText(code)).toBe("Unknown")
    })
  })

  describe("getPrescriptionTypeDisplayText", () => {
    it("returns 'Acute' for type 0001", () => {
      expect(getPrescriptionTypeDisplayText("0001")).toBe("Acute")
      expect(getPrescriptionTypeDisplayText("0001", 1, 5)).toBe("Acute")
    })

    it("returns 'Repeat' for type 0002 with no instance info", () => {
      expect(getPrescriptionTypeDisplayText("0002")).toBe("Repeat")
    })

    it("returns 'Repeat X of Y' for type 0002 with instance info", () => {
      expect(getPrescriptionTypeDisplayText("0002", 1, 5)).toBe("Repeat 1 of 5")
      expect(getPrescriptionTypeDisplayText("0002", 3, 6)).toBe("Repeat 3 of 6")
    })

    it("returns 'eRD' for type 0003 with no instance info", () => {
      expect(getPrescriptionTypeDisplayText("0003")).toBe("eRD")
    })

    it("returns 'eRD X of Y' for type 0003 with instance info", () => {
      expect(getPrescriptionTypeDisplayText("0003", 2, 10)).toBe("eRD 2 of 10")
      expect(getPrescriptionTypeDisplayText("0003", 5, 12)).toBe("eRD 5 of 12")
    })

    it("returns 'Unknown' for invalid prescription types", () => {
      expect(getPrescriptionTypeDisplayText("0000")).toBe("Unknown")
      expect(getPrescriptionTypeDisplayText("")).toBe("Unknown")
      expect(getPrescriptionTypeDisplayText("INVALID")).toBe("Unknown")
    })

    it("handles missing or partial instance information correctly", () => {
      expect(getPrescriptionTypeDisplayText("0002", 2)).toBe("Repeat")
      expect(getPrescriptionTypeDisplayText("0003", 3)).toBe("eRD")
      expect(getPrescriptionTypeDisplayText("0002", undefined, 6)).toBe("Repeat")
      expect(getPrescriptionTypeDisplayText("0003", undefined, 10)).toBe("eRD")
    })
  })
})
