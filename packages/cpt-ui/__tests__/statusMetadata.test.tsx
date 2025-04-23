import {
  getStatusTagColour,
  getStatusDisplayText,
  getItemStatusTagColour,
  getItemStatusDisplayText
} from "@/helpers/statusMetadata"

describe("getStatusTagColour", () => {
  it("returns correct colour for known prescription code", () => {
    expect(getStatusTagColour("0000")).toBe("orange")
    expect(getStatusTagColour("0006")).toBe("green")
  })

  it("returns fallback 'red' for unknown prescription code", () => {
    expect(getStatusTagColour("9999")).toBe("red")
  })
})

describe("getStatusDisplayText", () => {
  it("returns correct label for known prescription code", () => {
    expect(getStatusDisplayText("0002")).toBe("Downloaded by a dispenser")
    expect(getStatusDisplayText("0005")).toBe("Cancelled")
  })

  it("returns fallback 'Unknown' for unknown prescription code", () => {
    expect(getStatusDisplayText("9999")).toBe("Unknown")
  })
})

describe("getItemStatusTagColour", () => {
  it("returns correct colour for known item code", () => {
    expect(getItemStatusTagColour("0001")).toBe("green")
    expect(getItemStatusTagColour("0005")).toBe("red")
  })

  it("returns fallback 'red' for unknown item code", () => {
    expect(getItemStatusTagColour("9999")).toBe("red")
  })
})

describe("getItemStatusDisplayText", () => {
  it("returns correct label for known item code", () => {
    expect(getItemStatusDisplayText("0004")).toBe("Item not dispensed - owing")
    expect(getItemStatusDisplayText("0008")).toBe("Item with dispenser")
  })

  it("returns fallback 'Unknown' for unknown item code", () => {
    expect(getItemStatusDisplayText("9999")).toBe("Unknown")
  })
})
