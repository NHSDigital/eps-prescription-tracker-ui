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

export const errorFocusMap: Record<string, string | ((input: {dobDay: string, dobMonth: string, dobYear: string})
  => string)> = {
    firstName: "first-name",
    lastName: "last-name",
    dobRequired: "dob-day",
    dobDayRequired: "dob-day",
    dobMonthRequired: "dob-month",
    dobYearRequired: "dob-year",
    dobNonNumericDay: "dob-day",
    dobNonNumericMonth: "dob-month",
    dobNonNumericYear: "dob-year",
    dobYearTooShort: "dob-year",
    dobFutureDate: "dob-year",

    // Dynamic focus logic for invalid date
    dobInvalidDate: ({dobDay, dobMonth, dobYear}) => {
      const numeric = /^\d+$/
      if (!numeric.test(dobDay)) return "dob-day"
      if (!numeric.test(dobMonth)) return "dob-month"
      if (!numeric.test(dobYear) || dobYear.length < 4) return "dob-year"
      return "dob-day" // fallback
    },

    postcode: "postcode-only"
  }
