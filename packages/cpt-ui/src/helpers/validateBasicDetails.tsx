import {ErrorKey} from "./basicDetailsValidationMeta"

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
  const fullPostcode = /^[A-Za-z\d ]+$/

  // --- First name ---
  if (firstName.length > 35) errors.push("firstNameTooLong")
  if (firstName && !onlyLettersAndAllowed.test(firstName)) {
    errors.push("firstNameInvalidChars")
  }

  // --- Last name ---
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

  let dobInvalidDatePushed = false
  const allEmpty = !hasDay && !hasMonth && !hasYear

  if (allEmpty) {
    errors.push("dobRequired")
  } else {
    // Day
    if (!hasDay) {
      errors.push("dobDayRequired")
    } else if (!dayIsNumeric) {
      errors.push("dobNonNumericDay")
    } else if (parseInt(dobDay, 10) === 0 && !dobInvalidDatePushed) {
      errors.push("dobInvalidDate")
      dobInvalidDatePushed = true
    }

    // Month
    if (!hasMonth) {
      errors.push("dobMonthRequired")
    } else if (!monthIsNumeric) {
      errors.push("dobNonNumericMonth")
    } else if (parseInt(dobMonth, 10) === 0 && !dobInvalidDatePushed) {
      errors.push("dobInvalidDate")
      dobInvalidDatePushed = true
    }

    // Year
    if (!hasYear) {
      errors.push("dobYearRequired")
    } else if (!yearIsNumeric) {
      errors.push("dobNonNumericYear")
    } else {
      if (dobYear.length < 4) errors.push("dobYearTooShort")
      if (parseInt(dobYear, 10) === 0 && !dobInvalidDatePushed) {
        errors.push("dobInvalidDate")
        dobInvalidDatePushed = true
      }
    }

    // Real date check
    const canParseDate =
      hasDay &&
      hasMonth &&
      hasYear &&
      dayIsNumeric &&
      monthIsNumeric &&
      yearIsNumeric &&
      dobYear.length === 4 &&
      parseInt(dobDay, 10) > 0 &&
      parseInt(dobMonth, 10) > 0 &&
      parseInt(dobYear, 10) > 0

    if (canParseDate) {
      const dob = new Date(
        `${dobYear.padStart(4, "0")}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`
      )
      if (isNaN(dob.getTime()) && !dobInvalidDatePushed) {
        errors.push("dobInvalidDate")
      } else if (dob > new Date()) {
        errors.push("dobFutureDate")
      }
    }
  }

  // --- Postcode ---
  if (postcode) {
    if (postcode.length < 5) errors.push("postcodeTooShort")
    if (!fullPostcode.test(postcode)) errors.push("postcodeInvalidChars")
  }

  return errors
}
