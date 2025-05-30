import {
  getStatusTagColour,
  getStatusDisplayText,
  getItemStatusTagColour,
  getItemStatusDisplayText,
  getPrescriptionTypeDisplayText,
  itemStatusMap,
  prescriptionStatusMap,
  formatDateForPrescriptions
} from "@/helpers/statusMetadata"

import {STATUS_LABELS} from "@/constants/ui-strings/StatusLabels"

describe("Status Metadata Utility Functions", () => {
  describe("getStatusTagColour", () => {
    it.each(Object.keys(STATUS_LABELS.prescription))(
      "returns the correct colour for known prescription status code %s",
      (code) => {
        const result = getStatusTagColour(code)
        const expected = prescriptionStatusMap[code].color

        expect(result).toBe(expected)
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
      "returns the correct colour for known item status code %s",
      (code) => {
        const result = getItemStatusTagColour(code)
        const expected = itemStatusMap[code].color

        expect(result).toBe(expected)
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

  describe("formatDateForPrescriptions", () => {
    it.each([
      ["2024-01-01", "01-Jan-2024"],
      ["2025-12-31", "31-Dec-2025"],
      ["1999-07-15", "15-Jul-1999"],
      ["2023-03-05T10:00:00Z", "05-Mar-2023"]
    ])("formats valid ISO date string '%s' as '%s'", (input, expected) => {
      expect(formatDateForPrescriptions(input)).toBe(expected)
    })

    it.each([
      ["", "Invalid date"],
      ["not-a-date", "Invalid date"],
      ["01/2024", "Invalid date"],
      [null as unknown as string, "Invalid date"],
      [undefined as unknown as string, "Invalid date"]
    ])("returns 'Invalid date' for invalid input '%s'", (input, expected) => {
      expect(formatDateForPrescriptions(input)).toBe(expected)
    })
  })
})
