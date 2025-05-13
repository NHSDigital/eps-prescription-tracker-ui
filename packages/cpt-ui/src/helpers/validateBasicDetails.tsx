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

export function validateBasicDetails(input: ValidationInput): Array<ErrorKey> {
  const errors: Array<ErrorKey> = []
  const {firstName, lastName, dobDay, dobMonth, dobYear, postcode} = input

  const onlyLettersAndAllowed = /^[A-Za-zÀ-ÿ \-'.]*$/
  const numericOnly = /^\d+$/

  // --- First Name ---
  if (firstName.length > 35) errors.push("firstNameTooLong")
  if (firstName && !onlyLettersAndAllowed.test(firstName)) {
    errors.push("firstNameInvalidChars")
  }

  // --- Last Name ---
  if (!lastName.trim()) {
    errors.push("lastNameRequired")
  } else {
    if (lastName.length > 35) errors.push("lastNameTooLong")
    if (!onlyLettersAndAllowed.test(lastName)) {
      errors.push("lastNameInvalidChars")
    }
  }

  // --- DOB ---
  const hasDay = dobDay !== ""
  const hasMonth = dobMonth !== ""
  const hasYear = dobYear !== ""

  const dayIsNumeric = numericOnly.test(dobDay)
  const monthIsNumeric = numericOnly.test(dobMonth)
  const yearIsNumeric = numericOnly.test(dobYear)

  const allEmpty = !hasDay && !hasMonth && !hasYear

  if (allEmpty) {
    errors.push("dobRequired")
  } else {
    if (!hasDay) {
      errors.push("dobDayRequired")
    } else if (!dayIsNumeric) {
      errors.push("dobNonNumericDay")
    }

    if (!hasMonth) {
      errors.push("dobMonthRequired")
    } else if (!monthIsNumeric) {
      errors.push("dobNonNumericMonth")
    }

    if (!hasYear) {
      errors.push("dobYearRequired")
    } else if (!yearIsNumeric) {
      errors.push("dobNonNumericYear")
    } else if (dobYear.length < 4) {
      errors.push("dobYearTooShort")
    }

    const canConstructDate =
      hasDay && hasMonth && hasYear &&
      dayIsNumeric && monthIsNumeric && yearIsNumeric &&
      dobYear.length === 4

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

  // --- Postcode ---
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

export function getInlineErrors(errors: Array<ErrorKey>): Array<[string, string]> {
  const {errors: STR} = STRINGS
  const inlineErrors: Array<[string, string]> = []

  // First Name
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

  // Last Name
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

  // DOB
  const dobErrors = errors.filter(e => e.startsWith("dob"))
  if (dobErrors.includes("dobRequired")) {
    inlineErrors.push(["dob", STR.dobRequired])
  } else if (dobErrors.includes("dobDayRequired")) {
    inlineErrors.push(["dob", STR.dobDayRequired])
  } else if (dobErrors.includes("dobMonthRequired")) {
    inlineErrors.push(["dob", STR.dobMonthRequired])
  } else if (dobErrors.includes("dobYearRequired")) {
    inlineErrors.push(["dob", STR.dobYearRequired])
  } else if (dobErrors.includes("dobNonNumericDay")) {
    inlineErrors.push(["dob", STR.dobNonNumericDay])
  } else if (dobErrors.includes("dobNonNumericMonth")) {
    inlineErrors.push(["dob", STR.dobNonNumericMonth])
  } else if (dobErrors.includes("dobNonNumericYear")) {
    inlineErrors.push(["dob", STR.dobNonNumericYear])
  } else if (dobErrors.includes("dobYearTooShort")) {
    inlineErrors.push(["dob", STR.dobYearTooShort])
  } else if (dobErrors.includes("dobInvalidDate")) {
    inlineErrors.push(["dob", STR.dobInvalidDate])
  } else if (dobErrors.includes("dobFutureDate")) {
    inlineErrors.push(["dob", STR.dobFutureDate])
  }

  // Postcode
  if (errors.includes("postcodeInvalidChars")) {
    inlineErrors.push(["postcode", STR.postcodeInvalidChars])
  } else if (errors.includes("postcodeTooShort")) {
    inlineErrors.push(["postcode", STR.postcodeTooShort])
  }

  return inlineErrors
}
