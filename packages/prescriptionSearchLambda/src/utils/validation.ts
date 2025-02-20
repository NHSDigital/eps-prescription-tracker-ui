import {SearchParams} from "../types"

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

/**
 * Validates search parameters according to business rules
 * @param params Search parameters to validate
 * @throws ValidationError if validation fails
 */
export function validateSearchParams(params: SearchParams): void {
  // Check that at least one parameter is provided
  if (!params.prescriptionId && !params.nhsNumber) {
    throw new ValidationError("Either prescriptionId or nhsNumber must be provided")
  }

  // Check that only one parameter is provided
  if (params.prescriptionId && params.nhsNumber) {
    throw new ValidationError("Cannot search by both prescriptionId and nhsNumber")
  }

  // Validate NHS Number format if provided
  if (params.nhsNumber && !isValidNhsNumber(params.nhsNumber)) {
    throw new ValidationError("Invalid NHS number format")
  }

  // Validate Prescription ID format if provided
  if (params.prescriptionId && !isValidPrescriptionId(params.prescriptionId)) {
    throw new ValidationError("Invalid prescription ID format")
  }
}

/**
 * Validates NHS Number format and checksum
 * @param nhsNumber NHS Number to validate
 * @returns boolean indicating if NHS Number is valid
 */
function isValidNhsNumber(nhsNumber: string): boolean {
  // NHS Number format: 10 digits with optional spaces/hyphens
  const NHS_NUMBER_REGEX = /^(\d{3}[-\s]?\d{3}[-\s]?\d{4}|\d{10})$/

  // Basic format check
  if (!NHS_NUMBER_REGEX.test(nhsNumber)) {
    return false
  }

  // Remove any spaces or hyphens
  const cleanNhsNumber = nhsNumber.replace(/[-\s]/g, "")
  const digits = cleanNhsNumber.split("").map(Number)

  // Calculate checksum using modulus 11 algorithm
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += (10 - i) * digits[i]
  }

  const remainder = sum % 11
  const checkDigit = 11 - remainder

  // Validate check digit according to NHS rules
  if (checkDigit === 11) {
    return digits[9] === 0
  }
  if (checkDigit === 10) {
    return false // Invalid NHS number
  }
  return checkDigit === digits[9]
}

/**
 * Validates Prescription ID format
 * @param prescriptionId Prescription ID to validate
 * @returns boolean indicating if Prescription ID is valid
 */
function isValidPrescriptionId(prescriptionId: string): boolean {
  // Prescription ID format validation
  // Format for England: Starts with 01 or 1x
  // Format for Wales: Starts with 02 or 2x
  // Other formats are considered unknown but valid
  const PRESCRIPTION_ID_REGEX = /^\d{1,2}[A-Za-z0-9-]{1,48}$/

  return PRESCRIPTION_ID_REGEX.test(prescriptionId)
}
