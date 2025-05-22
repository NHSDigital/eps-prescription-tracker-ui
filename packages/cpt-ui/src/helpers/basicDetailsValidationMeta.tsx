/**
 * Defines all possible validation error keys used in the basic details search page
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
 * Defines the possible DOB fields
 */
type DobField = "day" | "month" | "year"

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
}): Array<DobField> => {
  const invalidFields = new Set<DobField>()

  // Utility helpers
  const isNumeric = (value: string) => /^\d+$/.test(value)
  const toInt = (value: string) => parseInt(value, 10)

  const isDayNumeric = isNumeric(dobDay)
  const isMonthNumeric = isNumeric(dobMonth)
  const isYearNumeric = isNumeric(dobYear)

  // --- Flag year if format or content is invalid ---
  if (shouldFlagYear(dobYear, isYearNumeric)) invalidFields.add("year")

  // --- Flag non-numeric fields ---
  addIfNotNumeric(isDayNumeric, "day", invalidFields)
  addIfNotNumeric(isMonthNumeric, "month", invalidFields)

  // --- Flag values out of allowed numeric range ---
  addIfOutOfRange(isDayNumeric, dobDay, 1, 31, "day", invalidFields)
  addIfOutOfRange(isMonthNumeric, dobMonth, 1, 12, "month", invalidFields)

  // --- Cross-field calendar date validity ---
  if (canCheckDate(isDayNumeric, isMonthNumeric, isYearNumeric, dobYear)) {
    const day = toInt(dobDay)
    const month = toInt(dobMonth)
    const year = toInt(dobYear)

    if (!isValidDate(day, month, year)) {
      addDateMismatchFlags(dobDay, dobMonth, invalidFields)
    }
  }

  return Array.from(invalidFields)
}

/**
 * Adds the field if its numeric value is out of allowed range.
 */
function addIfOutOfRange(
  isNumeric: boolean,
  value: string,
  min: number,
  max: number,
  field: DobField,
  invalidFields: Set<DobField>
) {
  if (isNumeric && !isValidNumericInRange(value, min, max)) {
    invalidFields.add(field)
  }
}

/**
 * Adds the field if it's not numeric.
 */
function addIfNotNumeric(
  isNumeric: boolean,
  field: DobField,
  invalidFields: Set<DobField>
) {
  if (!isNumeric) invalidFields.add(field)
}

/**
 * Adds specific field flags if a valid date cannot be constructed.
 */
function addDateMismatchFlags(
  dobDay: string,
  dobMonth: string,
  invalidFields: Set<DobField>
) {
  const dayInRange = isValidNumericInRange(dobDay, 1, 31)
  const monthInRange = isValidNumericInRange(dobMonth, 1, 12)

  if (!monthInRange) invalidFields.add("month")
  if (!dayInRange) invalidFields.add("day")

  // If day and month are in range, assume the year is logically wrong (e.g. 31/02/2022)
  if (dayInRange && monthInRange) invalidFields.add("year")
}

// --- Determines if the year field should be flagged as invalid ---
function shouldFlagYear(year: string, isNumeric: boolean): boolean {
  if (!isNumeric || year.length !== 4 || !/^\d{4}$/.test(year)) return true
  const yearNum = parseInt(year, 10)
  return yearNum < 1800 || yearNum > 2099
}

// --- Checks if all DOB parts are numeric and year has 4 digits ---
function canCheckDate(
  isDayNumeric: boolean,
  isMonthNumeric: boolean,
  isYearNumeric: boolean,
  year: string
): boolean {
  return isDayNumeric && isMonthNumeric && isYearNumeric && year.length === 4
}
