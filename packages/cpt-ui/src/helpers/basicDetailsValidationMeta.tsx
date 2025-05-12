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

export const errorFocusMap: Partial<Record<ErrorKey, string>> = {
  firstNameTooLong: "first-name",
  firstNameInvalidChars: "first-name",
  lastNameRequired: "last-name",
  lastNameTooLong: "last-name",
  lastNameInvalidChars: "last-name",
  dobRequired: "dob-day",
  dobDayRequired: "dob-day",
  dobMonthRequired: "dob-month",
  dobYearRequired: "dob-year",
  dobNonNumericDay: "dob-day",
  dobNonNumericMonth: "dob-month",
  dobNonNumericYear: "dob-year",
  dobYearTooShort: "dob-year",
  dobInvalidDate: "dob-day", // Focus on the first field in group
  dobFutureDate: "dob-day",
  postcodeTooShort: "postcode-only",
  postcodeInvalidChars: "postcode-only"
}
