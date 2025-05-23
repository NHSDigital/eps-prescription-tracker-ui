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

// --- Constants ---
const NUMERIC_REGEX = /^\d+$/
const DOB_DAY_RANGE = [1, 31] as const
const DOB_MONTH_RANGE = [1, 12] as const
const DOB_YEAR_RANGE = [1800, 2099] as const

// --- Helpers ---
const isNumeric = (val: string) => NUMERIC_REGEX.test(val)
const toInt = (val: string) => parseInt(val, 10)
const isValidNumericInRange = (value: string, min: number, max: number): boolean =>
  isNumeric(value) && (toInt(value) >= min && toInt(value) <= max)

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
  // Fast path checks, ordered visually
  if (!isNumeric(dobDay)) return "dob-day"
  if (!isNumeric(dobMonth)) return "dob-month"
  if (!isNumeric(dobYear) && dobYear) return "dob-year"
  if (dobYear.length > 0 && dobYear.length < 4) return "dob-year"
  if (!dobYear) return "dob-day"

  // Range checks
  if (!isValidNumericInRange(dobDay, ...DOB_DAY_RANGE)) return "dob-day"
  if (!isValidNumericInRange(dobMonth, ...DOB_MONTH_RANGE)) return "dob-month"

  // Date validity check
  const day = toInt(dobDay), month = toInt(dobMonth), year = toInt(dobYear)
  if (!isValidDate(day, month, year)) {
    // All parts in range, but date is impossible (e.g., 31/11/2015)
    return "dob-day"
  }
  // fallback
  return "dob-day"
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
  const invalid = new Set<DobField>()

  const dayNum = toInt(dobDay), monthNum = toInt(dobMonth), yearNum = toInt(dobYear)
  const dayIsNum = isNumeric(dobDay), monthIsNum = isNumeric(dobMonth), yearIsNum = isNumeric(dobYear)

  // --- Year checks ---
  if (!yearIsNum || dobYear.length !== 4 || !isValidNumericInRange(dobYear, ...DOB_YEAR_RANGE))
    invalid.add("year")

  // --- Non-numeric fields ---
  if (!dayIsNum) invalid.add("day")
  if (!monthIsNum) invalid.add("month")

  // --- Out-of-range numeric fields ---
  if (dayIsNum && !isValidNumericInRange(dobDay, ...DOB_DAY_RANGE)) invalid.add("day")
  if (monthIsNum && !isValidNumericInRange(dobMonth, ...DOB_MONTH_RANGE)) invalid.add("month")

  // --- Calendar validity ---
  if (dayIsNum && monthIsNum && yearIsNum && dobYear.length === 4) {
    if (!isValidDate(dayNum, monthNum, yearNum)) {
      // Distinguish between bad ranges and impossible dates
      const dayInRange = isValidNumericInRange(dobDay, ...DOB_DAY_RANGE)
      const monthInRange = isValidNumericInRange(dobMonth, ...DOB_MONTH_RANGE)
      if (!dayInRange) invalid.add("day")
      if (!monthInRange) invalid.add("month")
      if (dayInRange && monthInRange) {
        invalid.add("day")
        invalid.add("month")
        invalid.add("year")
      }
    } else if (new Date(yearNum, monthNum - 1, dayNum) > new Date()) {
      // Future date
      invalid.add("year")
    }
  }

  return Array.from(invalid)
}
