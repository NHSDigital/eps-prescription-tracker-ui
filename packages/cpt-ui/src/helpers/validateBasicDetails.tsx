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

// Main validation function that checks user input and returns an array of error keys
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

  // --- Date of Birth validations ---
  // Track which fields are filled
  const hasDay = dobDay !== ""
  const hasMonth = dobMonth !== ""
  const hasYear = dobYear !== ""

  // Track which fields are numeric
  const dayIsNumeric = numericOnly.test(dobDay)
  const monthIsNumeric = numericOnly.test(dobMonth)
  const yearIsNumeric = numericOnly.test(dobYear)

  const allEmpty = !hasDay && !hasMonth && !hasYear

  if (allEmpty) {
    // No DOB fields provided
    errors.push("dobRequired")
  } else if (!hasDay || !hasMonth || !hasYear) {
    // Incomplete DOB input (one or two fields missing)

    // Convert to numbers only if numeric and present
    const numericDay = hasDay && dayIsNumeric ? parseInt(dobDay, 10) : null
    const numericMonth = hasMonth && monthIsNumeric ? parseInt(dobMonth, 10) : null

    // Check if numeric day/month are out of bounds
    const invalidNumericDay = numericDay !== null && (numericDay < 1 || numericDay > 31)
    const invalidNumericMonth = numericMonth !== null && (numericMonth < 1 || numericMonth > 12)

    // Any non-numeric values in filled fields
    const partialNonNumeric =
      (hasDay && !dayIsNumeric) ||
      (hasMonth && !monthIsNumeric) ||
      (hasYear && !yearIsNumeric)

    // Only one field filled (clearly insufficient)
    const filledCount = [hasDay, hasMonth, hasYear].filter(Boolean).length

    const shouldBeInvalidDate =
      invalidNumericDay || invalidNumericMonth || partialNonNumeric || filledCount === 1

    if (shouldBeInvalidDate) {
      errors.push("dobInvalidDate")
    } else {
      // Highlight exactly which field(s) are missing
      if (!hasDay) errors.push("dobDayRequired")
      if (!hasMonth) errors.push("dobMonthRequired")
      if (!hasYear) errors.push("dobYearRequired")
    }
  } else {
    // All DOB fields are present

    const nonNumericFields = [
      !dayIsNumeric,
      !monthIsNumeric,
      !yearIsNumeric
    ].filter(Boolean).length

    const hasShortYear = yearIsNumeric && dobYear.length < 4

    if (nonNumericFields >= 2 || (nonNumericFields === 1 && hasShortYear)) {
      // Multiple numeric problems – collapse to generic error
      errors.push("dobInvalidDate")
    } else {
      // Specific numeric field errors
      if (!dayIsNumeric) errors.push("dobNonNumericDay")
      if (!monthIsNumeric) errors.push("dobNonNumericMonth")
      if (!yearIsNumeric) errors.push("dobNonNumericYear")

      if (yearIsNumeric && dobYear.length < 4) {
        errors.push("dobYearTooShort")
      }

      // Try to validate the constructed date only if all fields are numeric and year has 4 digits
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

// Maps internal error keys to inline UI error messages.
// Returns a list of [fieldKey, errorMessage] tuples used for rendering inline + summary errors.
export function getInlineErrors(errors: Array<ErrorKey>): Array<[string, string]> {
  const {errors: STR} = STRINGS
  const inlineErrors: Array<[string, string]> = []

  // --- First Name Error Handling ---
  const firstTooLong = errors.includes("firstNameTooLong")
  const firstInvalid = errors.includes("firstNameInvalidChars")

  if (firstTooLong && firstInvalid) {
    // Combined error message for multiple issues
    inlineErrors.push([
      "firstName",
      "First name must be 35 characters or less, and can only include letters, hyphens, apostrophes and spaces"
    ])
  } else if (firstTooLong) {
    inlineErrors.push(["firstName", STR.firstNameTooLong])
  } else if (firstInvalid) {
    inlineErrors.push(["firstName", STR.firstNameInvalidChars])
  }

  // --- Last Name Error Handling ---
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

  // --- Date of Birth Error Handling ---
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

  // Add DOB errors directly using their corresponding UI string
  dobErrorKeys.forEach(key => {
    if (errors.includes(key)) {
      inlineErrors.push([key, STR[key]])
    }
  })

  // --- Postcode Error Handling ---
  if (errors.includes("postcodeInvalidChars")) {
    inlineErrors.push(["postcode", STR.postcodeInvalidChars])
  } else if (errors.includes("postcodeTooShort")) {
    inlineErrors.push(["postcode", STR.postcodeTooShort])
  }

  return inlineErrors
}
