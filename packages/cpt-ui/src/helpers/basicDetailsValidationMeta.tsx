// Defines all possible validation error keys used in the UI
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

// Shared logic used in both error highlighting and focus resolution
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

  // Prioritize errors in visual order: day -> month -> year
  if (!numeric.test(dobDay)) return "dob-day"
  if (!numeric.test(dobMonth)) return "dob-month"
  if (!numeric.test(dobYear)) return "dob-year"
  if (dobYear.length < 4) return "dob-year"

  const day = parseInt(dobDay, 10)
  const month = parseInt(dobMonth, 10)
  const year = parseInt(dobYear, 10)

  const constructed = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`)

  const isValid =
    constructed.getFullYear() === year &&
    constructed.getMonth() === month - 1 &&
    constructed.getDate() === day

  // Visual priority for invalid structured date: day -> month -> year
  if (!isValid) {
    if (day < 1 || day > 31) return "dob-day"
    if (month < 1 || month > 12) return "dob-month"
    return "dob-year"
  }

  return "dob-day" // fallback
}

// Maps each error key to the DOM element ID it should focus when triggered
export const errorFocusMap: Record<
  string,
  string | ((input: {dobDay: string; dobMonth: string; dobYear: string}) => string)
> = {
  firstName: "first-name",
  lastName: "last-name",

  // Fallback focus for missing DOB
  dobRequired: "dob-day",

  // Individual DOB field focus
  dobDayRequired: "dob-day",
  dobMonthRequired: "dob-month",
  dobYearRequired: "dob-year",

  // Focus for non-numeric DOB inputs
  dobNonNumericDay: "dob-day",
  dobNonNumericMonth: "dob-month",
  dobNonNumericYear: "dob-year",

  // Focus for year-specific errors
  dobYearTooShort: "dob-year",
  dobFutureDate: "dob-year",

  // Dynamically determine focus for invalid structured DOB
  dobInvalidDate: resolveDobInvalidField,

  // Postcode field
  postcode: "postcode-only"
}

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

  const isDayInvalid = !numeric.test(dobDay)
  const isMonthInvalid = !numeric.test(dobMonth)
  const isYearInvalid = !numeric.test(dobYear)
  const isYearTooShort = dobYear.length > 0 && dobYear.length < 4
  const isYearMissing = dobYear === ""

  if (isDayInvalid) invalidFields.push("day")
  if (isMonthInvalid) invalidFields.push("month")
  if (isYearInvalid || isYearTooShort || isYearMissing) invalidFields.push("year")

  const allNumeric = !isDayInvalid && !isMonthInvalid && !isYearInvalid && !isYearTooShort && !isYearMissing

  if (allNumeric) {
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
        invalidFields.push("year")
      }
    }
  }

  return Array.from(new Set(invalidFields))
}
