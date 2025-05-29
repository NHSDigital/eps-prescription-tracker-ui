import {validateShortFormId} from "@/helpers/prescriptionIdChecksum"

// Enum-like type representing all possible validation errors.
export type PrescriptionValidationError =
  | "empty"
  | "chars"
  | "length"
  | "combined"
  | "noMatch"

// Defines the order of error precedence when multiple issues are present.
export const PRIORITY_ORDER: Array<PrescriptionValidationError> = [
  "combined",
  "empty",
  "chars",
  "length",
  "noMatch"
]

// Converts a raw prescription ID string into a normalized format
export const normalizePrescriptionId = (raw: string): string => {
  const cleaned = raw.replace(/[^a-zA-Z0-9+]/g, "")
  return cleaned.match(/.{1,6}/g)?.join("-").toUpperCase() ?? ""
}

// Given an array of validation errors, returns the one with the highest priority
export const getHighestPriorityError = (
  errors: Array<PrescriptionValidationError>
): PrescriptionValidationError | null => {
  return PRIORITY_ORDER.find((key) => errors.includes(key)) ?? null
}

// Main validation logic for prescription ID input
export const validatePrescriptionId = (
  rawInput: string
): Array<PrescriptionValidationError> => {
  const raw = rawInput.trim()

  // Check for empty input
  if (!raw) {
    return ["empty"]
  }

  // Determine whether input contains invalid characters
  const hasInvalidChars = !/^[a-zA-Z0-9+ -]*$/.test(raw)

  // Remove all characters except alphanumeric and '+' to get a cleaned version
  const cleaned = raw.replace(/[^a-zA-Z0-9+]/g, "").toUpperCase()
  const isInvalidLength = cleaned.length !== 18

  // Return combined error if both character and length checks fail
  if (hasInvalidChars && isInvalidLength) {
    return ["combined"]
  }

  // Return specific individual errors if present
  if (hasInvalidChars) return ["chars"]
  if (isInvalidLength) return ["length"]

  // Format the cleaned input into expected prescription ID structure
  const formatted = normalizePrescriptionId(cleaned)

  // Validate structure of formatted ID
  const shortFormPattern = /^[0-9A-F]{6}-[0-9A-Z]{6}-[0-9A-F]{5}[0-9A-Z+]$/
  if (!shortFormPattern.test(formatted)) {
    return ["noMatch"]
  }

  // Validate checksum using MOD 37-2 algorithm
  if (!validateShortFormId(formatted)) {
    return ["noMatch"]
  }

  // Return empty array if no validation errors were found
  return []
}
