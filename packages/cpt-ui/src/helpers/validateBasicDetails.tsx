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

// --- Validate the individual DOB input fields and detect errors ---
function validateDob(dobDay: string, dobMonth: string, dobYear: string): Array<ErrorKey> {
  const errors: Array<ErrorKey> = []

  const hasDay = !!dobDay
  const hasMonth = !!dobMonth
  const hasYear = !!dobYear

  const isDayNumeric = /^\d+$/.test(dobDay)
  const isMonthNumeric = /^\d+$/.test(dobMonth)
  const isYearNumeric = /^\d+$/.test(dobYear)

  const numericDay = isDayNumeric ? parseInt(dobDay, 10) : null
  const numericMonth = isMonthNumeric ? parseInt(dobMonth, 10) : null

  // Case: all fields are empty — trigger single required error
  if (isAllDobFieldsEmpty(hasDay, hasMonth, hasYear)) return ["dobRequired"]

  // Case: one or more fields missing or partially invalid
  if (isPartialDob(hasDay, hasMonth, hasYear)) {
    if (
      hasSingleField(hasDay, hasMonth, hasYear) ||
      hasInvalidPartialInput(hasDay, hasMonth, hasYear, isDayNumeric, isMonthNumeric, isYearNumeric) ||
      isDayMonthOutOfRange(numericDay, numericMonth)
    ) {
      return ["dobInvalidDate"]
    }

    // Add specific missing field errors
    if (!hasDay) errors.push("dobDayRequired")
    if (!hasMonth) errors.push("dobMonthRequired")
    if (!hasYear) errors.push("dobYearRequired")
    return errors
  }

  // Case: all fields present — validate individual field format and value ranges
  const formatErrors = getDobFormatErrors(dobDay, dobMonth, dobYear)

  // Collapse multiple issues into a single generic error
  if (formatErrors.length > 1) return ["dobInvalidDate"]
  errors.push(...formatErrors)

  // Validate real calendar date and check it's not in the future
  if (canConstructValidDate(isDayNumeric, isMonthNumeric, isYearNumeric, dobYear)) {
    const dob = buildDate(dobDay, dobMonth, dobYear)

    if (!isExactDateMatch(dob, dobDay, dobMonth, dobYear)) return ["dobInvalidDate"]
    if (dob > new Date()) errors.push("dobFutureDate")
  }

  return errors
}

// --- Check if all DOB fields are empty ---
function isAllDobFieldsEmpty(day: boolean, month: boolean, year: boolean): boolean {
  return !day && !month && !year
}

// --- Check if any DOB field is missing ---
function isPartialDob(day: boolean, month: boolean, year: boolean): boolean {
  return !day || !month || !year
}

// --- Check if only one DOB field is filled ---
function hasSingleField(day: boolean, month: boolean, year: boolean): boolean {
  return [day, month, year].filter(Boolean).length === 1
}

// --- Check for any non-numeric value among filled fields ---
function hasInvalidPartialInput(
  day: boolean,
  month: boolean,
  year: boolean,
  isDayNumeric: boolean,
  isMonthNumeric: boolean,
  isYearNumeric: boolean
): boolean {
  return (day && !isDayNumeric) || (month && !isMonthNumeric) || (year && !isYearNumeric)
}

// --- Validate numeric day/month are within correct range ---
function isDayMonthOutOfRange(day: number | null, month: number | null): boolean {
  return (day !== null && (day < 1 || day > 31)) || (month !== null && (month < 1 || month > 12))
}

// --- Check that day/month/year are all numeric and year is 4 digits ---
function canConstructValidDate(dayValid: boolean, monthValid: boolean, yearValid: boolean, year: string): boolean {
  return dayValid && monthValid && yearValid && year.length === 4
}

// --- Build a JS Date object from given DOB parts ---
function buildDate(day: string, month: string, year: string): Date {
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
}

// --- Confirm that constructed date matches input exactly ---
function isExactDateMatch(date: Date, day: string, month: string, year: string): boolean {
  return (
    date.getFullYear() === parseInt(year, 10) &&
    date.getMonth() === parseInt(month, 10) - 1 &&
    date.getDate() === parseInt(day, 10)
  )
}

// --- Identifies format and range errors for DOB inputs individually ---
function getDobFormatErrors(dobDay: string, dobMonth: string, dobYear: string): Array<ErrorKey> {
  const errors: Array<ErrorKey> = []
  const numericOnly = /^\d+$/

  const isDayNumeric = numericOnly.test(dobDay)
  const isMonthNumeric = numericOnly.test(dobMonth)
  const isYearNumeric = numericOnly.test(dobYear)

  // Add numeric format errors per field
  if (!isDayNumeric) errors.push("dobNonNumericDay")
  if (!isMonthNumeric) errors.push("dobNonNumericMonth")
  if (!isYearNumeric) errors.push("dobNonNumericYear")

  // Year must be 4 digits if numeric
  if (isYearNumeric && dobYear.length < 4) errors.push("dobYearTooShort")

  const numericDay = isDayNumeric ? parseInt(dobDay, 10) : null
  const numericMonth = isMonthNumeric ? parseInt(dobMonth, 10) : null

  // Add range errors if numeric values fall outside expected boundaries
  if (numericDay !== null && (numericDay < 1 || numericDay > 31)) {
    errors.push("dobInvalidDate")
  }

  if (numericMonth !== null && (numericMonth < 1 || numericMonth > 12)) {
    errors.push("dobInvalidDate")
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

/**
 * Validates a full set of basic patient details, including name, DOB, and postcode.
 * Returns an array of error keys for invalid or incomplete input fields.
 */
export function validateBasicDetails(input: ValidationInput): Array<ErrorKey> {
  let errors: Array<ErrorKey> = []

  errors.push(...validateFirstName(input.firstName))
  errors.push(...validateLastName(input.lastName))

  const dobErrors = validateDob(input.dobDay, input.dobMonth, input.dobYear)
  // Collapse excessive DOB errors into a single generic error if needed
  errors.push(...(dobErrors.length > 2 ? ["dobInvalidDate"] as Array<ErrorKey> : dobErrors))

  errors.push(...validatePostcode(input.postcode))

  return errors
}

/**
 * Maps a list of error keys into field-specific inline error messages.
 * Used to drive summary links and field-level error hints in the UI.
 */
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
