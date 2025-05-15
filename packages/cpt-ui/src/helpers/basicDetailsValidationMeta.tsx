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

// Maps each error key to the DOM element ID it should focus when triggered
export const errorFocusMap: Record<string, string | ((input: {dobDay: string, dobMonth: string, dobYear: string})
  => string)> = {
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

    // Dynamically determine focus based on which DOB field is first invalid
    dobInvalidDate: ({dobDay, dobMonth, dobYear}) => {
      const numeric = /^\d+$/
      if (!numeric.test(dobDay)) return "dob-day"
      if (!numeric.test(dobMonth)) return "dob-month"
      if (!numeric.test(dobYear) || dobYear.length < 4) return "dob-year"
      return "dob-day" // fallback
    },

    // Postcode field
    postcode: "postcode-only"
  }
