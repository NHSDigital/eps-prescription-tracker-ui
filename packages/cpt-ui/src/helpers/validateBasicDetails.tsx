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

// Main validation function
export function validateBasicDetails(input: ValidationInput): Array<ErrorKey> {
  const errors: Array<ErrorKey> = []
  const {firstName, lastName, dobDay, dobMonth, dobYear, postcode} = input

  const onlyLettersAndAllowed = /^[A-Za-zÀ-ÿ \-'.]*$/
  const numericOnly = /^\d+$/

  // --- First name validations ---
  if (firstName.length > 35) errors.push("firstNameTooLong")
  if (firstName && !onlyLettersAndAllowed.test(firstName)) {
    errors.push("firstNameInvalidChars")
  }

  // --- Last name validations ---
  if (!lastName.trim()) {
    errors.push("lastNameRequired")
  } else {
    if (lastName.length > 35) errors.push("lastNameTooLong")
    if (!onlyLettersAndAllowed.test(lastName)) {
      errors.push("lastNameInvalidChars")
    }
  }

  // --- Date of Birth (DOB) validations ---
  const hasDay = dobDay !== ""
  const hasMonth = dobMonth !== ""
  const hasYear = dobYear !== ""

  const dayIsNumeric = numericOnly.test(dobDay)
  const monthIsNumeric = numericOnly.test(dobMonth)
  const yearIsNumeric = numericOnly.test(dobYear)

  const allEmpty = !hasDay && !hasMonth && !hasYear

  if (allEmpty) {
    // If all DOB fields are empty, it's required
    errors.push("dobRequired")
  } else if (!hasDay || !hasMonth || !hasYear) {
    // Partial DOB: check structure and numeric-ness
    const nonNumericCount = [
      {val: dobDay, isNumeric: dayIsNumeric},
      {val: dobMonth, isNumeric: monthIsNumeric},
      {val: dobYear, isNumeric: yearIsNumeric}
    ].filter(({val, isNumeric}) => val !== "" && !isNumeric).length

    const numericCount = [
      hasDay && dayIsNumeric,
      hasMonth && monthIsNumeric,
      hasYear && yearIsNumeric
    ].filter(Boolean).length

    const emptyCount = [!hasDay, !hasMonth, !hasYear].filter(Boolean).length

    // One non-numeric, one empty, one valid — treat as invalid
    if (
      (nonNumericCount === 1 && emptyCount === 1 && numericCount === 1) ||
      nonNumericCount >= 2 || // Two or more non-numeric
      [hasDay, hasMonth, hasYear].filter(Boolean).length === 1 // Only one field filled
    ) {
      errors.push("dobInvalidDate")
    } else {
      // Otherwise, treat missing parts individually
      if (!hasDay) errors.push("dobDayRequired")
      else if (!hasMonth) errors.push("dobMonthRequired")
      else if (!hasYear) errors.push("dobYearRequired")
    }
  } else {
    // All three DOB parts are present
    const nonNumericFields = [
      !dayIsNumeric,
      !monthIsNumeric,
      !yearIsNumeric
    ].filter(Boolean).length

    const hasShortYear = yearIsNumeric && dobYear.length < 4

    if (nonNumericFields >= 2 || (nonNumericFields === 1 && hasShortYear)) {
      // Collapse to generic invalid date if multiple numeric issues
      errors.push("dobInvalidDate")
    } else {
      // Specific numeric errors
      if (!dayIsNumeric) errors.push("dobNonNumericDay")
      if (!monthIsNumeric) errors.push("dobNonNumericMonth")
      if (!yearIsNumeric) errors.push("dobNonNumericYear")

      if (yearIsNumeric && dobYear.length < 4) {
        errors.push("dobYearTooShort")
      }

      // Try to construct and validate the date
      const canConstructDate =
        dayIsNumeric && monthIsNumeric && yearIsNumeric && dobYear.length === 4

      if (canConstructDate) {
        const year = parseInt(dobYear, 10)
        const month = parseInt(dobMonth, 10)
        const day = parseInt(dobDay, 10)

        const dob = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
        const isValid =
          dob.getFullYear() === year &&
          dob.getMonth() === month - 1 &&
          dob.getDate() === day

        if (!isValid) {
          errors.push("dobInvalidDate")
        } else if (dob > new Date()) {
          errors.push("dobFutureDate")
        }
      }
    }
  }

  // --- Collapse multiple DOB errors into a single generic one ---
  const dobErrorKeys: Array<ErrorKey> = [
    "dobDayRequired",
    "dobMonthRequired",
    "dobYearRequired",
    "dobNonNumericDay",
    "dobNonNumericMonth",
    "dobNonNumericYear",
    "dobYearTooShort",
    "dobInvalidDate",
    "dobFutureDate"
  ]

  const dobErrors = errors.filter(e => dobErrorKeys.includes(e))
  if (dobErrors.length > 2) {
    // Replace with a single "dobInvalidDate" error if too many DOB-related issues
    for (const err of dobErrors) {
      const i = errors.indexOf(err)
      if (i !== -1) errors.splice(i, 1)
    }
    errors.push("dobInvalidDate")
  }

  // --- Postcode validation ---
  if (postcode) {
    const trimmed = postcode.trim()
    const isValidChars = /^[A-Za-z0-9 ]+$/.test(trimmed)

    if (!isValidChars) {
      errors.push("postcodeInvalidChars")
    } else if (trimmed.length < 5) {
      errors.push("postcodeTooShort")
    }
  }

  return errors
}

// Maps error keys to user-facing inline error messages
export function getInlineErrors(errors: Array<ErrorKey>): Array<[string, string]> {
  const {errors: STR} = STRINGS
  const inlineErrors: Array<[string, string]> = []

  // --- First Name errors ---
  const firstTooLong = errors.includes("firstNameTooLong")
  const firstInvalid = errors.includes("firstNameInvalidChars")
  if (firstTooLong && firstInvalid) {
    inlineErrors.push([
      "firstName",
      "First name must be 35 characters or less, and can only include letters, hyphens, apostrophes and spaces"
    ])
  } else if (firstTooLong) {
    inlineErrors.push(["firstName", STR.firstNameTooLong])
  } else if (firstInvalid) {
    inlineErrors.push(["firstName", STR.firstNameInvalidChars])
  }

  // --- Last Name errors ---
  if (errors.includes("lastNameRequired")) {
    inlineErrors.push(["lastName", STR.lastNameRequired])
  } else {
    const lastTooLong = errors.includes("lastNameTooLong")
    const lastInvalid = errors.includes("lastNameInvalidChars")
    if (lastTooLong && lastInvalid) {
      inlineErrors.push([
        "lastName",
        "Last name must be 35 characters or less, and can only include letters, hyphens, apostrophes and spaces"
      ])
    } else if (lastTooLong) {
      inlineErrors.push(["lastName", STR.lastNameTooLong])
    } else if (lastInvalid) {
      inlineErrors.push(["lastName", STR.lastNameInvalidChars])
    }
  }

  // --- Date of Birth errors ---
  const dobErrorKeys: Array<ErrorKey> = [
    "dobRequired",
    "dobDayRequired",
    "dobMonthRequired",
    "dobYearRequired",
    "dobNonNumericDay",
    "dobNonNumericMonth",
    "dobNonNumericYear",
    "dobYearTooShort",
    "dobInvalidDate",
    "dobFutureDate"
  ]

  dobErrorKeys.forEach(key => {
    if (errors.includes(key)) {
      inlineErrors.push([key, STR[key]])
    }
  })

  // --- Postcode errors ---
  if (errors.includes("postcodeInvalidChars")) {
    inlineErrors.push(["postcode", STR.postcodeInvalidChars])
  } else if (errors.includes("postcodeTooShort")) {
    inlineErrors.push(["postcode", STR.postcodeTooShort])
  }

  return inlineErrors
}
