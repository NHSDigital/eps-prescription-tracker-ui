
import {Client} from "client"
import {
  FamilyName,
  FamilyNameFromStringOutcomeType,
  DateOfBirth,
  DateOfBirthFromStringOutcomeType,
  Postcode,
  PostcodeFromStringOutcomeType
} from "./types"
import {exhaustive_switch_guard} from "utils"
import {AxiosCallOutcomeType} from "axios_wrapper"

// type PatientSummary = {
//   familyName: string,
//   givenName: string,
//   dateOfBirth: string,
//   address: string,
//   postcode: string,
//   nhsNumber: string,
// }

enum PatientSearchOutcomeType {
  PLACEHOLDER = "PLACEHOLDER",
  INVALID_PARAMETERS = "INVALID_PARAMETERS",
  AXIOS_ERROR = "AXIOS_ERROR",
}

type InvalidParameter = {
  name: string,
  error: string
}
type PatientSearchOutcome =
  | { type: PatientSearchOutcomeType.PLACEHOLDER }
  | { type: PatientSearchOutcomeType.INVALID_PARAMETERS, validationErrors: Array<InvalidParameter> }
  | { type: PatientSearchOutcomeType.AXIOS_ERROR, error: Error, url: string, timeMs: number }

async function patientSearch(
  client: Client,
  _familyName: string,
  _dateOfBirth: string,
  _postcode: string
): Promise<PatientSearchOutcome> {
  // Input validation
  let validationErrors: Array<InvalidParameter> = []

  const familyName = validateFamilyName(_familyName, validationErrors)
  const dateOfBirth = validateDateOfBirth(_dateOfBirth, validationErrors)
  const postcode = validatePostcode(_postcode, validationErrors)
  if (validationErrors.length > 0) {
    return {
      type: PatientSearchOutcomeType.INVALID_PARAMETERS,
      validationErrors
    }
  }

  // API call
  const url = client.patientSearchPath(
    familyName as FamilyName,
    dateOfBirth as DateOfBirth,
    postcode as Postcode
  )
  const headers = {}
  const additionalLogParams = {}
  const api_call = await client.axios_get(
    url,
    headers,
    additionalLogParams
  )
  if (api_call.type === AxiosCallOutcomeType.ERROR) {
    return {
      type: PatientSearchOutcomeType.AXIOS_ERROR,
      error: api_call.error,
      url,
      timeMs: api_call.timeMs
    }
  }
  const data = api_call.data

  throw data
}

const validateFamilyName = (_familyName: string, validationErrors: Array<InvalidParameter>): FamilyName | undefined => {
  let familyName

  const familyNameValidationOutcome = FamilyName.from_string(_familyName)
  switch (familyNameValidationOutcome.type) {
    case FamilyNameFromStringOutcomeType.OK:
      familyName = familyNameValidationOutcome.familyName
      break
    case FamilyNameFromStringOutcomeType.TOO_LONG:
      validationErrors.push({
        name: "familyName",
        error: "Family name can be at most 35 characters"
      })
      break
    case FamilyNameFromStringOutcomeType.WILDCARD_TOO_SOON:
      validationErrors.push({
        name: "familyName",
        error: "Wildcard cannot be in first 2 characters"
      })
      break
    default:
      exhaustive_switch_guard(familyNameValidationOutcome)
  }

  return familyName
}

const validateDateOfBirth = (
  _dateOfBirth: string,
  validationErrors: Array<InvalidParameter>
): DateOfBirth | undefined => {
  let dateOfBirth

  const dateOfBirthValidationOutcome = DateOfBirth.from_string(_dateOfBirth)
  switch (dateOfBirthValidationOutcome.type) {
    case DateOfBirthFromStringOutcomeType.OK:
      dateOfBirth = dateOfBirthValidationOutcome.dateOfBirth
      break
    case DateOfBirthFromStringOutcomeType.BAD_FORMAT:
      validationErrors.push({
        name: "dateOfBirth",
        error: "Date of birth must be in YYYY-MM-DD format"
      })
      break
    case DateOfBirthFromStringOutcomeType.INVALID_DATE:
      validationErrors.push({
        name: "dateOfBirth",
        error: "Date of birth is not a valid date"
      })
      break
    default:
      exhaustive_switch_guard(dateOfBirthValidationOutcome)
  }

  return dateOfBirth
}

const validatePostcode = (_postcode: string, validationErrors: Array<InvalidParameter>): Postcode | undefined => {
  let postcode

  const postcodeValidationOutcome = Postcode.from_string(_postcode)
  switch (postcodeValidationOutcome.type) {
    case PostcodeFromStringOutcomeType.OK:
      postcode = postcodeValidationOutcome.postcode
      break
    case PostcodeFromStringOutcomeType.WILDCARD_TOO_SOON:
      validationErrors.push({
        name: "postcode",
        error: "Wildcard cannot be in first 2 characters"
      })
      break
    default:
      exhaustive_switch_guard(postcodeValidationOutcome)
  }

  return postcode
}

export {
  PatientSearchOutcome as Outcome,
  PatientSearchOutcomeType as OutcomeType,
  patientSearch
}
