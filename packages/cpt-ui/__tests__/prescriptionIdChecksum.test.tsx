import {
  generateShortFormId,
  generateShortFormIdFromExisting,
  validateShortFormId
} from "@/helpers/prescriptionIdChecksum"

describe("prescriptionIdChecksum", () => {
  it("generates a valid short form ID with correct checksum", () => {
    const id = generateShortFormId("A83008")
    expect(id).toMatch(/^[0-9A-F]{6}-[0-9A-Z]{6}-[0-9A-F]{5}[0-9A-Z+]$/)
    expect(validateShortFormId(id)).toBe(true)
  })

  it("generates a valid short form ID from an existing one", () => {
    const original = "9AD427-A83008-2E461+"
    const newId = generateShortFormIdFromExisting(original)
    expect(newId).toMatch(/^[0-9A-F]{6}-[0-9A-Z]{6}-[0-9A-F]{5}[0-9A-Z+]$/)
    expect(validateShortFormId(newId)).toBe(true)
  })

  it("validates a correct short form ID", () => {
    const id = "9AD427-A83008-2E461K"
    expect(validateShortFormId(id)).toBe(true)
  })

  it("rejects an ID with incorrect checksum", () => {
    const invalidId = "9AD427-A83008-2E461X"
    expect(validateShortFormId(invalidId)).toBe(false)
  })

  it("rejects ID with malformed structure", () => {
    expect(validateShortFormId("invalid-format-id")).toBe(false)
  })
})
