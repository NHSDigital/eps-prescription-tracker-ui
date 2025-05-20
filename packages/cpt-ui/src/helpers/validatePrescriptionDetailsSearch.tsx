import {validateShortFormId} from "@/helpers/prescriptionIdChecksum"

export type PrescriptionValidationError =
  | "empty"
  | "chars"
  | "length"
  | "combined"
  | "noMatch"

const normalizePrescriptionId = (raw: string): string => {
  const cleaned = raw.replace(/[^a-zA-Z0-9+]/g, "")
  return cleaned.match(/.{1,6}/g)?.join("-").toUpperCase() || ""
}

export const validatePrescriptionId = (rawInput: string): Array<PrescriptionValidationError> => {
  const raw = rawInput.trim()

  if (!raw) {
    return ["empty"]
  }

  const hasInvalidChars = !/^[a-zA-Z0-9+ -]*$/.test(raw)
  const cleaned = raw.replace(/[^a-zA-Z0-9+]/g, "").toUpperCase()
  const isInvalidLength = cleaned.length !== 18

  if (hasInvalidChars && isInvalidLength && raw.length !== 18) {
    return ["combined"]
  }
  if (hasInvalidChars) return ["chars"]
  if (isInvalidLength) return ["length"]

  const formatted = normalizePrescriptionId(cleaned)
  const shortFormPattern = /^[0-9A-F]{6}-[0-9A-Z]{6}-[0-9A-F]{5}[0-9A-Z+]$/
  if (!shortFormPattern.test(formatted)) return ["noMatch"]
  if (!validateShortFormId(formatted)) return ["noMatch"]

  return []
}
