/**
 * Defines all possible validation error keys used across the UI
 */
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

// --- Validates if a string is a numeric value within a given range ---
const isValidNumericInRange = (value: string, min: number, max: number): boolean => {
  const isNumeric = /^\d+$/.test(value)
  const num = parseInt(value, 10)
  return isNumeric && num >= min && num <= max
}

// --- Validates if the provided day, month, and year form a valid date ---
const isValidDate = (day: number, month: number, year: number): boolean => {
  const date = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

/**
 * Determines which individual DOB input field (day, month, or year)
 * should receive focus when a `dobInvalidDate` error is triggered.
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
  const isDayNumeric = /^\d+$/.test(dobDay)
  const isMonthNumeric = /^\d+$/.test(dobMonth)
  const isYearNumeric = /^\d+$/.test(dobYear)
  const isYearTooShort = dobYear.length > 0 && dobYear.length < 4
  const isYearMissing = dobYear === ""

  // Field-level checks in visible order
  if (!isDayNumeric) return "dob-day"
  if (!isMonthNumeric) return "dob-month"
  if (!isYearNumeric && dobYear !== "") return "dob-year"
  if (isYearTooShort) return "dob-year"
  if (isYearMissing) return "dob-day"

  // Range checks
  if (!isValidNumericInRange(dobDay, 1, 31)) return "dob-day"
  if (!isValidNumericInRange(dobMonth, 1, 12)) return "dob-month"

  const day = parseInt(dobDay, 10)
  const month = parseInt(dobMonth, 10)
  const year = parseInt(dobYear, 10)

  // Full date validity check
  if (!isValidDate(day, month, year)) {
    if (!isValidNumericInRange(dobDay, 1, 31)) return "dob-day"
    if (!isValidNumericInRange(dobMonth, 1, 12)) return "dob-month"
    return "dob-year"
  }

  return "dob-day" // fallback
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
  postcode: "postcode-only",

  // DOB-specific error mappings
  dobRequired: "dob-day",
  dobDayRequired: "dob-day",
  dobMonthRequired: "dob-month",
  dobYearRequired: "dob-year",
  dobNonNumericDay: "dob-day",
  dobNonNumericMonth: "dob-month",
  dobNonNumericYear: "dob-year",
  dobYearTooShort: "dob-year",
  dobFutureDate: "dob-year",
  dobInvalidDate: resolveDobInvalidField
}

/**
 * Identifies which DOB input fields (day/month/year) should be visually styled
 * with an error class when a `dobInvalidDate` error is triggered.
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
  const invalidFields = new Set<"day" | "month" | "year">()

  // Utility helpers
  const isNumeric = (value: string) => /^\d+$/.test(value)
  const toInt = (value: string) => parseInt(value, 10)
  const isEmpty = (value: string) => value === ""

  // Numeric checks for each field
  const isDayNumeric = isNumeric(dobDay)
  const isMonthNumeric = isNumeric(dobMonth)
  const isYearNumeric = isNumeric(dobYear)

  // Special year format checks
  const isYearTooShort = dobYear.length > 0 && dobYear.length < 4
  const isYearMissing = isEmpty(dobYear)
  const isYearAllZero = dobYear === "0000"

  // Determine if year should be flagged as invalid
  if (shouldFlagYear(isYearNumeric, isYearMissing, isYearTooShort, isYearAllZero)) {
    invalidFields.add("year")
  }

  // Non-numeric or missing fields
  if (!isDayNumeric) invalidFields.add("day")
  if (!isMonthNumeric) invalidFields.add("month")

  // Range-based validation
  if (isDayNumeric && !isValidNumericInRange(dobDay, 1, 31)) invalidFields.add("day")
  if (isMonthNumeric && !isValidNumericInRange(dobMonth, 1, 12)) invalidFields.add("month")

  // Cross-field date validation if eligible
  if (canCheckDate(isDayNumeric, isMonthNumeric, isYearNumeric, dobYear)) {
    const day = toInt(dobDay)
    const month = toInt(dobMonth)
    const year = toInt(dobYear)

    if (!isValidDate(day, month, year)) {
      // Add more specific field errors if date is not valid
      const monthInRange = isValidNumericInRange(dobMonth, 1, 12)
      const dayInRange = isValidNumericInRange(dobDay, 1, 31)

      if (!monthInRange) invalidFields.add("month")
      if (!dayInRange) invalidFields.add("day")

      // If day and month are in range, assume the year is logically wrong (e.g. 31/02/2022)
      if (monthInRange && dayInRange) invalidFields.add("year")
    }
  }

  return Array.from(invalidFields)
}

// --- Determines if the year field should be considered invalid ---
function shouldFlagYear(
  isYearNumeric: boolean,
  isYearMissing: boolean,
  isYearTooShort: boolean,
  isYearAllZero: boolean
): boolean {
  return (!isYearNumeric && !isYearMissing) || isYearTooShort || isYearMissing || isYearAllZero
}

// --- Determines if cross-field date check can be performed ---
function canCheckDate(
  isDayNumeric: boolean,
  isMonthNumeric: boolean,
  isYearNumeric: boolean,
  year: string
): boolean {
  return isDayNumeric && isMonthNumeric && isYearNumeric && year.length === 4
}
