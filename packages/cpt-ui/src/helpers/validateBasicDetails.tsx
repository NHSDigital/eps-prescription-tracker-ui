import {ErrorKey} from "./basicDetailsValidationMeta"
import {STRINGS} from "@/constants/ui-strings/BasicDetailsSearchStrings"

interface ValidationInput {
  firstName: string
  lastName: string
  dobDay: string
  dobMonth: string
  dobYear: string
  postcode: string
}

// --- Validate the first name input field ---
function validateFirstName(firstName: string): Array<ErrorKey> {
  const errors: Array<ErrorKey> = []
  const onlyLetters = /^[A-Za-zÀ-ÿ \-'.]*$/

  // Length check
  if (firstName.length > 35) errors.push("firstNameTooLong")

  // Character validity check
  if (firstName && !onlyLetters.test(firstName)) errors.push("firstNameInvalidChars")

  return errors
}

// --- Validate the last name input field ---
function validateLastName(lastName: string): Array<ErrorKey> {
  const errors: Array<ErrorKey> = []
  const onlyLetters = /^[A-Za-zÀ-ÿ \-'.]*$/

  // Required field check
  if (!lastName.trim()) {
    errors.push("lastNameRequired")
  } else {
    // Length and character validity checks
    if (lastName.length > 35) errors.push("lastNameTooLong")
    if (!onlyLetters.test(lastName)) errors.push("lastNameInvalidChars")
  }

  return errors
}

// --- Validate the individual DOB inputs: day, month, and year ---
function validateDob(dobDay: string, dobMonth: string, dobYear: string): Array<ErrorKey> {
  const errors: Array<ErrorKey> = []
  const numericOnly = /^\d+$/

  // Track field presence
  const hasDay = !!dobDay
  const hasMonth = !!dobMonth
  const hasYear = !!dobYear

  // Track numeric format
  const isDayNumeric = numericOnly.test(dobDay)
  const isMonthNumeric = numericOnly.test(dobMonth)
  const isYearNumeric = numericOnly.test(dobYear)

  // Case: all fields are empty
  if (!hasDay && !hasMonth && !hasYear) return ["dobRequired"]

  // Case: some fields are missing
  if (!hasDay || !hasMonth || !hasYear) {
    const filled = [hasDay, hasMonth, hasYear].filter(Boolean).length
    const partialInvalid =
      (hasDay && !isDayNumeric) ||
      (hasMonth && !isMonthNumeric) ||
      (hasYear && !isYearNumeric)

    const numericDay = isDayNumeric ? parseInt(dobDay, 10) : null
    const numericMonth = isMonthNumeric ? parseInt(dobMonth, 10) : null

    // If there's only one field filled, non-numeric values, or out-of-range day/month — it's invalid
    if (
      (numericDay !== null && (numericDay < 1 || numericDay > 31)) ||
      (numericMonth !== null && (numericMonth < 1 || numericMonth > 12)) ||
      partialInvalid ||
      filled === 1
    ) {
      return ["dobInvalidDate"]
    }

    // Add specific missing field errors
    if (!hasDay) errors.push("dobDayRequired")
    if (!hasMonth) errors.push("dobMonthRequired")
    if (!hasYear) errors.push("dobYearRequired")
    return errors
  }

  // Validate numeric content and year length
  const tempErrors: Array<ErrorKey> = []

  if (!isDayNumeric) tempErrors.push("dobNonNumericDay")
  if (!isMonthNumeric) tempErrors.push("dobNonNumericMonth")
  if (!isYearNumeric) tempErrors.push("dobNonNumericYear")
  if (isYearNumeric && dobYear.length < 4) tempErrors.push("dobYearTooShort")

  // Range checks
  const numericDay = isDayNumeric ? parseInt(dobDay, 10) : null
  const numericMonth = isMonthNumeric ? parseInt(dobMonth, 10) : null
  const dayOutOfRange = numericDay !== null && (numericDay < 1 || numericDay > 31)
  const monthOutOfRange = numericMonth !== null && (numericMonth < 1 || numericMonth > 12)

  // If more than one DOB-related issue exists, collapse into a single generic error
  if (tempErrors.length + Number(dayOutOfRange) + Number(monthOutOfRange) > 1) {
    return ["dobInvalidDate"]
  }

  errors.push(...tempErrors)

  // Validate the actual constructed date if inputs are complete and numeric
  const canValidateDate = isDayNumeric && isMonthNumeric && isYearNumeric && dobYear.length === 4
  if (canValidateDate) {
    const day = parseInt(dobDay, 10)
    const month = parseInt(dobMonth, 10)
    const year = parseInt(dobYear, 10)

    const dob = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`)

    // Check if date is valid and not in the future
    const isValid =
      dob.getFullYear() === year &&
      dob.getMonth() === month - 1 &&
      dob.getDate() === day

    if (!isValid) {
      return ["dobInvalidDate"]
    } else if (dob > new Date()) {
      errors.push("dobFutureDate")
    }
  }

  return errors
}

// --- Validate postcode input ---
function validatePostcode(postcode: string): Array<ErrorKey> {
  const errors: Array<ErrorKey> = []
  if (!postcode) return errors

  const trimmed = postcode.trim()
  const isValid = /^[A-Za-z0-9 ]+$/.test(trimmed)

  // Validate character content and length
  if (!isValid) {
    errors.push("postcodeInvalidChars")
  } else if (trimmed.length < 5) {
    errors.push("postcodeTooShort")
  }

  return errors
}

// --- Entry point: validates the full form input and aggregates all errors ---
export function validateBasicDetails(input: ValidationInput): Array<ErrorKey> {
  let errors: Array<ErrorKey> = []

  errors.push(...validateFirstName(input.firstName))
  errors.push(...validateLastName(input.lastName))

  const dobErrors = validateDob(input.dobDay, input.dobMonth, input.dobYear)
  // Collapse excessive DOB errors into a single generic error if needed
  errors.push(...(dobErrors.length > 2 ? ["dobInvalidDate"] : dobErrors))

  errors.push(...validatePostcode(input.postcode))

  return errors
}

// --- Maps error keys to UI messages for summary and inline rendering ---
export function getInlineErrors(errors: Array<ErrorKey>): Array<[string, string]> {
  const {errors: STR} = STRINGS
  const inlineErrors: Array<[string, string]> = []

  const add = (field: string, key: ErrorKey) => inlineErrors.push([field, STR[key]])

  // --- First name errors ---
  const hasFirst = errors.includes("firstNameTooLong") || errors.includes("firstNameInvalidChars")
  if (hasFirst) {
    const message = errors.includes("firstNameTooLong") && errors.includes("firstNameInvalidChars")
      ? "First name must be 35 characters or less, and can only include letters, hyphens, apostrophes and spaces"
      : STR[errors.find(e => e.startsWith("firstName"))!]
    inlineErrors.push(["firstName", message])
  }

  // --- Last name errors ---
  const hasLast =
    errors.includes("lastNameRequired") ||
    errors.includes("lastNameTooLong") ||
    errors.includes("lastNameInvalidChars")
  if (hasLast) {
    const message = errors.includes("lastNameTooLong") && errors.includes("lastNameInvalidChars")
      ? "Last name must be 35 characters or less, and can only include letters, hyphens, apostrophes and spaces"
      : STR[errors.find(e => e.startsWith("lastName"))!]
    inlineErrors.push(["lastName", message])
  }

  // --- DOB errors ---
  const dobKeys: Array<ErrorKey> = [
    "dobRequired", "dobDayRequired", "dobMonthRequired", "dobYearRequired",
    "dobNonNumericDay", "dobNonNumericMonth", "dobNonNumericYear",
    "dobYearTooShort", "dobInvalidDate", "dobFutureDate"
  ]
  for (const key of dobKeys) {
    if (errors.includes(key)) add(key, key)
  }

  // --- Postcode errors ---
  if (errors.includes("postcodeInvalidChars")) add("postcode", "postcodeInvalidChars")
  else if (errors.includes("postcodeTooShort")) add("postcode", "postcodeTooShort")

  return inlineErrors
}
