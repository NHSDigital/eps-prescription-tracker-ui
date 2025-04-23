import {
  getStatusTagColour,
  getStatusDisplayText,
  getItemStatusTagColour,
  getItemStatusDisplayText,
  getPrescriptionTypeDisplayText
} from "@/helpers/statusMetadata"

jest.mock("@/constants/ui-strings/StatusLabels", () => ({
  STATUS_LABELS: {
    prescription: {
      "0000": "Pending",
      "0001": "Available to download",
      "0002": "Downloaded by a dispenser",
      "0003": "Some items dispensed",
      "0004": "Expired",
      "0005": "Cancelled",
      "0006": "All items dispensed",
      "0007": "Not dispensed",
      "0008": "Claimed",
      "0009": "Not claimed",
      "9000": "Future eRD issue",
      "9001": "Future issue date dispense",
      "9005": "Future prescription cancelled"
    },
    item: {
      "0001": "Dispensed",
      "0002": "Pending",
      "0003": "Dispensed - owings",
      "0004": "Not dispensed",
      "0005": "Cancelled",
      "0006": "Expired",
      "0007": "Claimed",
      "0008": "Not claimed"
    }
  }
}))

describe("Status Metadata Utility Functions", () => {
  describe("getStatusTagColour", () => {
    it("returns the correct colour for valid prescription status codes", () => {
      expect(getStatusTagColour("0000")).toBe("orange")
      expect(getStatusTagColour("0001")).toBe("yellow")
      expect(getStatusTagColour("0002")).toBe("purple")
      expect(getStatusTagColour("0006")).toBe("green")
      expect(getStatusTagColour("9000")).toBe("aqua-green")
    })

    it("returns red for unknown prescription status codes", () => {
      expect(getStatusTagColour("UNKNOWN")).toBe("red")
      expect(getStatusTagColour("")).toBe("red")
      expect(getStatusTagColour("9999")).toBe("red")
    })
  })

  describe("getStatusDisplayText", () => {
    it("returns the correct label for valid prescription status codes", () => {
      expect(getStatusDisplayText("0000")).toBe("Pending")
      expect(getStatusDisplayText("0001")).toBe("Available to download")
      expect(getStatusDisplayText("0006")).toBe("All items dispensed")
      expect(getStatusDisplayText("9000")).toBe("Future eRD issue")
    })

    it("returns 'Unknown' for unknown prescription status codes", () => {
      expect(getStatusDisplayText("UNKNOWN")).toBe("Unknown")
      expect(getStatusDisplayText("")).toBe("Unknown")
      expect(getStatusDisplayText("9999")).toBe("Unknown")
    })
  })

  describe("getItemStatusTagColour", () => {
    it("returns the correct colour for valid item status codes", () => {
      expect(getItemStatusTagColour("0001")).toBe("green")
      expect(getItemStatusTagColour("0002")).toBe("orange")
      expect(getItemStatusTagColour("0003")).toBe("blue")
      expect(getItemStatusTagColour("0005")).toBe("red")
    })

    it("returns red for unknown item status codes", () => {
      expect(getItemStatusTagColour("UNKNOWN")).toBe("red")
      expect(getItemStatusTagColour("")).toBe("red")
      expect(getItemStatusTagColour("9999")).toBe("red")
    })
  })

  describe("getItemStatusDisplayText", () => {
    it("returns the correct label for valid item status codes", () => {
      expect(getItemStatusDisplayText("0001")).toBe("Dispensed")
      expect(getItemStatusDisplayText("0002")).toBe("Pending")
      expect(getItemStatusDisplayText("0003")).toBe("Dispensed - owings")
      expect(getItemStatusDisplayText("0005")).toBe("Cancelled")
    })

    it("returns 'Unknown' for unknown item status codes", () => {
      expect(getItemStatusDisplayText("UNKNOWN")).toBe("Unknown")
      expect(getItemStatusDisplayText("")).toBe("Unknown")
      expect(getItemStatusDisplayText("9999")).toBe("Unknown")
    })
  })

  describe("getPrescriptionTypeDisplayText", () => {
    it("returns 'Acute' for prescription type 0001", () => {
      expect(getPrescriptionTypeDisplayText("0001")).toBe("Acute")
      expect(getPrescriptionTypeDisplayText("0001", 1, 5)).toBe("Acute")
    })

    it("returns 'Repeat' for prescription type 0002 with no instance info", () => {
      expect(getPrescriptionTypeDisplayText("0002")).toBe("Repeat")
    })

    it("returns 'Repeat X of Y' for prescription type 0002 with instance info", () => {
      expect(getPrescriptionTypeDisplayText("0002", 1, 5)).toBe("Repeat 1 of 5")
      expect(getPrescriptionTypeDisplayText("0002", 3, 6)).toBe("Repeat 3 of 6")
    })

    it("returns 'eRD' for prescription type 0003 with no instance info", () => {
      expect(getPrescriptionTypeDisplayText("0003")).toBe("eRD")
    })

    it("returns 'eRD X of Y' for prescription type 0003 with instance info", () => {
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
