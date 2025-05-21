export const STRINGS = {
  heading: "Search using basic details",
  visuallyHiddenPrefix: "Search by",
  // eslint-disable-next-line max-len
  introText: "We can show a maximum of 10 search results. Enter as many details as you know to find the patient you're searching for.",
  firstNameLabel: "First name (optional)",
  lastNameLabel: "Last name",
  dobLabel: "Date of birth",
  dobHint: "For example, 31 03 1980",
  dobDay: "Day",
  dobMonth: "Month",
  dobYear: "Year",
  postcodeLabel: "Postcode (optional)",
  postcodeHint: "For example, LS1 1AB",
  buttonText: "Find a patient",
  errorSummaryHeading: "There is a problem",
  errors: {
    lastNameRequired: "Enter the patient's last name",
    lastNameTooLong: "Last name must be 35 characters or less",
    lastNameInvalidChars: "Last name can only include letters, hyphens, apostrophes and spaces",

    firstNameTooLong: "First name must be 35 characters or less",
    firstNameInvalidChars: "First name can only include letters, hyphens, apostrophes and spaces",

    dobRequired: "Enter the patient's date of birth",
    dobDayRequired: "Date of birth must include a day",
    dobMonthRequired: "Date of birth must include a month",
    dobYearRequired: "Date of birth must include a year",
    dobInvalidDate: "Date of birth must be a real date",
    dobFutureDate: "Date of birth must be in the past",
    dobYearTooShort: "Year must include 4 numbers",
    dobNonNumericDay: "Day must only include numbers",
    dobNonNumericMonth: "Month must only include numbers",
    dobNonNumericYear: "Year must only include numbers",

    postcodeTooShort: "Postcode must have at least 5 characters",
    postcodeInvalidChars: "Enter a real UK postcode"
  }
}
