// Defines all possible validation error keys used across the UI
export type ErrorKey =
  | "firstNameTooLong"
  | "firstNameInvalidChars"
  | "lastNameTooLong"
  | "lastNameRequired"
  | "lastNameInvalidChars"
  | "dobRequired"
  | "dobDayRequired"
  | "dobMonthRequired"
  | "dobYearRequired"
  | "dobInvalidDate"
  | "dobFutureDate"
  | "dobNonNumericDay"
  | "dobNonNumericMonth"
  | "dobNonNumericYear"
  | "dobYearTooShort"
  | "postcodeTooShort"
  | "postcodeInvalidChars"

/**
 * Determines which individual DOB input field (day, month, or year)
 * should receive focus when a `dobInvalidDate` error is triggered.
 * The logic prioritizes visible field order: day → month → year.
 */
export const resolveDobInvalidField = ({
  dobDay,
  dobMonth,
  dobYear
}: {
  dobDay: string
  dobMonth: string
  dobYear: string
}): string => {
  const numeric = /^\d+$/

  const isDayNumeric = numeric.test(dobDay)
  const isMonthNumeric = numeric.test(dobMonth)
  const isYearNumeric = numeric.test(dobYear)
  const isYearTooShort = dobYear.length > 0 && dobYear.length < 4
  const isYearMissing = dobYear === ""

  // Prioritize visibly ordered errors
  if (!isDayNumeric) return "dob-day"
  if (!isMonthNumeric) return "dob-month"
  if (!isYearNumeric && !isYearMissing) return "dob-year"
  if (isYearTooShort) return "dob-year"

  // Validate numeric but out-of-bounds values
  if (isDayNumeric) {
    const day = parseInt(dobDay, 10)
    if (day < 1 || day > 31) return "dob-day"
  }

  if (isMonthNumeric) {
    const month = parseInt(dobMonth, 10)
    if (month < 1 || month > 12) return "dob-month"
  }

  // If year is missing and day/month are invalid, default to day
  if (isYearMissing) {
    return "dob-day"
  }

  // Full date validation if all fields are numeric
  const day = parseInt(dobDay, 10)
  const month = parseInt(dobMonth, 10)
  const year = parseInt(dobYear, 10)

  const constructed = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
  const isValid =
    constructed.getFullYear() === year &&
    constructed.getMonth() === month - 1 &&
    constructed.getDate() === day

  if (!isValid) {
    if (day < 1 || day > 31) return "dob-day"
    if (month < 1 || month > 12) return "dob-month"
    return "dob-year"
  }

  return "dob-day" // fallback to day input
}

/**
 * Maps each error key to a DOM element ID (or resolver function) for autofocus behavior
 * when an error summary item is clicked.
 */
export const errorFocusMap: Record<
  string,
  string | ((input: {dobDay: string; dobMonth: string; dobYear: string}) => string)
> = {
  firstName: "first-name",
  lastName: "last-name",

  // Required DOB fallback focus
  dobRequired: "dob-day",

  // Field-specific DOB errors
  dobDayRequired: "dob-day",
  dobMonthRequired: "dob-month",
  dobYearRequired: "dob-year",

  // Non-numeric DOB fields
  dobNonNumericDay: "dob-day",
  dobNonNumericMonth: "dob-month",
  dobNonNumericYear: "dob-year",

  // Structural/year-based DOB issues
  dobYearTooShort: "dob-year",
  dobFutureDate: "dob-year",

  // Dynamic focus for invalid combined DOB
  dobInvalidDate: resolveDobInvalidField,

  // Postcode error focus
  postcode: "postcode-only"
}

/**
 * Identifies which individual DOB input fields (day/month/year)
 * should be visually styled with an error class for a `dobInvalidDate` error.
 */
export const resolveDobInvalidFields = ({
  dobDay,
  dobMonth,
  dobYear
}: {
  dobDay: string
  dobMonth: string
  dobYear: string
}): Array<"day" | "month" | "year"> => {
  const numeric = /^\d+$/
  const invalidFields: Array<"day" | "month" | "year"> = []

  const isDayNumeric = numeric.test(dobDay)
  const isMonthNumeric = numeric.test(dobMonth)
  const isYearNumeric = numeric.test(dobYear)
  const isYearTooShort = dobYear.length > 0 && dobYear.length < 4
  const isYearMissing = dobYear === ""

  // Mark non-numeric or missing fields
  if (!isDayNumeric) invalidFields.push("day")
  if (!isMonthNumeric) invalidFields.push("month")
  if (!isYearNumeric && !isYearMissing) invalidFields.push("year")
  if (isYearTooShort) invalidFields.push("year")
  if (isYearMissing) invalidFields.push("year")

  // Validate individual numeric values even if full date can't be constructed
  if (isDayNumeric) {
    const day = parseInt(dobDay, 10)
    if (day < 1 || day > 31) invalidFields.push("day")
  }

  if (isMonthNumeric) {
    const month = parseInt(dobMonth, 10)
    if (month < 1 || month > 12) invalidFields.push("month")
  }

  // Validate full constructed date if all fields are numeric and year is 4 digits
  const allValidNumeric = isDayNumeric && isMonthNumeric && isYearNumeric && dobYear.length === 4
  if (allValidNumeric) {
    const day = parseInt(dobDay, 10)
    const month = parseInt(dobMonth, 10)
    const year = parseInt(dobYear, 10)

    const constructed = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
    const isValid =
      constructed.getFullYear() === year &&
      constructed.getMonth() === month - 1 &&
      constructed.getDate() === day

    if (!isValid) {
      if (month < 1 || month > 12) invalidFields.push("month")
      if (day < 1 || day > 31) invalidFields.push("day")
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        // Logical fallback when day/month are structurally valid but the date is still invalid (e.g., 31/02/2020)
        invalidFields.push("year")
      }
    }
  }

  return Array.from(new Set(invalidFields)) // Ensure uniqueness
}
