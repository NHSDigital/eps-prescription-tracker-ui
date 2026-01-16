
import {PatientSummary} from "@cpt-ui-common/common-types"
import {exhaustive_switch_guard} from "@cpt-ui-common/lambdaUtils"
import {ErrorObject} from "ajv"
import {AxiosResponse} from "axios"
import * as axios from "../../axios_wrapper"
import {Client} from "../../client"
import {parsePatient} from "../../parsePatient"
import {ResourceType} from "../../schema/elements"
import {PatientMetaCode, UnrestrictedPatient} from "../../schema/patient"
import {ResponseValidator} from "../../schema/responseValidator"
import {PDSPatientSearchResponse, pdsPatientSearchResponseSchema, SuccessfulResponse} from "./schema"
import {
  DateOfBirth,
  DateOfBirthFromStringOutcomeType,
  Name,
  NameFromStringOutcomeType,
  PatientSearchParameters,
  Postcode,
  PostcodeFromStringOutcomeType,
  ValidatedParameter
} from "./types"

enum PatientSearchOutcomeType {
  SUCCESS = "SUCCESS",
  INVALID_PARAMETERS = "INVALID_PARAMETERS",
  AXIOS_ERROR = "AXIOS_ERROR",
  PARSE_ERROR = "RESPONSE_PARSE_ERROR",
  TOO_MANY_MATCHES = "TOO_MANY_MATCHES",
  PDS_ERROR = "PDS_ERROR"
}

type InvalidParameter = {
  name: ValidatedParameter,
  error: string
}
type PatientSearchOutcome =
  | { type: PatientSearchOutcomeType.SUCCESS, patients: Array<PatientSummary> }
  | { type: PatientSearchOutcomeType.INVALID_PARAMETERS, validationErrors: Array<InvalidParameter> }
  | { type: PatientSearchOutcomeType.AXIOS_ERROR, error: Error, url: string, timeMs: number }
  | { type: PatientSearchOutcomeType.PARSE_ERROR, response: AxiosResponse, validationErrors: Array<ErrorObject>}
  | { type: PatientSearchOutcomeType.TOO_MANY_MATCHES, searchParameters: PatientSearchParameters }
  | { type:PatientSearchOutcomeType.PDS_ERROR, response: AxiosResponse }

async function patientSearch(
  client: Client,
  _familyName: string,
  _dateOfBirth: string,
  _postcode?: string,
  _givenName?: string
): Promise<PatientSearchOutcome> {
  // Input validation
  let validationErrors: Array<InvalidParameter> = []
  let familyName
  let givenName
  let dateOfBirth
  let postcode

  [familyName, validationErrors] = validateName(_familyName, ValidatedParameter.FAMILY_NAME, validationErrors)
  if (_givenName !== undefined) {
    [givenName, validationErrors] = validateName(_givenName, ValidatedParameter.GIVEN_NAME, validationErrors)
  }
  [dateOfBirth, validationErrors] = validateDateOfBirth(_dateOfBirth, validationErrors)
  if (_postcode !== undefined) {
    [postcode, validationErrors] = validatePostcode(_postcode, validationErrors)
  }
  if (validationErrors.length > 0) {
    return {
      type: PatientSearchOutcomeType.INVALID_PARAMETERS,
      validationErrors
    }
  }

  // API call
  const searchParameters: PatientSearchParameters = {
    familyName: familyName as Name,
    givenName: givenName,
    dateOfBirth: dateOfBirth as DateOfBirth,
    postcode: postcode
  }
  const url = client.patientSearchPath(
    searchParameters
  )

  const api_call = await client.axios_get(url)
  if (api_call.type === axios.OutcomeType.ERROR) {
    return {
      type: PatientSearchOutcomeType.AXIOS_ERROR,
      error: api_call.error,
      url: url.toString(),
      timeMs: api_call.timeMs
    }
  }
  const response = api_call.response
  let data = api_call.data

  // Check for response errors
  if (response.status !== 200) {
    return {
      type: PatientSearchOutcomeType.PDS_ERROR,
      response
    }
  }

  const responseValidator = new ResponseValidator<PDSPatientSearchResponse>(pdsPatientSearchResponseSchema)
  const isValidResponse = responseValidator.validate(data)
  if (!isValidResponse) {
    return {
      type: PatientSearchOutcomeType.PARSE_ERROR,
      response,
      validationErrors: responseValidator.validationErrors()
    }
  }
  // Check for too many matches
  // (Response is a 200, and the body is an OperationOutcome.
  // Response body is either a bundle or a
  // too many matches operation outcome as verified by the schema)
  if(data.resourceType === ResourceType.OPERATION_OUTCOME){
    return {
      type: PatientSearchOutcomeType.TOO_MANY_MATCHES,
      searchParameters
    }
  }

  // Check for empty response (Empty response has no .entry field)
  if (data.total === 0) {
    return {
      type: PatientSearchOutcomeType.SUCCESS,
      patients: []
    }
  }

  // Parse response
  const patients: Array<PatientSummary> = (data as SuccessfulResponse)
    .entry
    // Filter out restricted/redacted patients
    .filter((entry) => entry.resource.meta.security[0].code === PatientMetaCode.UNRESTRICTED)
    .map((entry) => entry.resource as UnrestrictedPatient)
    .map(parsePatient)

  return {
    type: PatientSearchOutcomeType.SUCCESS,
    patients
  }
}

const validateName = (
  _name: string,
  name_type: ValidatedParameter.FAMILY_NAME | ValidatedParameter.GIVEN_NAME,
  validationErrors: Array<InvalidParameter>
): [Name | undefined, Array<InvalidParameter>] => {
  let name

  const nameValidationOutcome = Name.from_string(_name)
  switch (nameValidationOutcome.type) {
    case NameFromStringOutcomeType.OK:
      name = nameValidationOutcome.Name
      break
    case NameFromStringOutcomeType.TOO_LONG:
      validationErrors.push({
        name: name_type,
        error: `Name can be at most 35 characters`
      })
      break
    case NameFromStringOutcomeType.WILDCARD_TOO_SOON:
      validationErrors.push({
        name: name_type,
        error: "Wildcard cannot be in first 2 characters"
      })
      break
    default:
      exhaustive_switch_guard(nameValidationOutcome)
  }

  return [name, validationErrors]
}

const validateDateOfBirth = (
  _dateOfBirth: string,
  validationErrors: Array<InvalidParameter>
): [DateOfBirth | undefined, Array<InvalidParameter>] => {
  let dateOfBirth

  const dateOfBirthValidationOutcome = DateOfBirth.from_string(_dateOfBirth)
  switch (dateOfBirthValidationOutcome.type) {
    case DateOfBirthFromStringOutcomeType.OK:
      dateOfBirth = dateOfBirthValidationOutcome.dateOfBirth
      break
    case DateOfBirthFromStringOutcomeType.BAD_FORMAT:
      validationErrors.push({
        name: ValidatedParameter.DATE_OF_BIRTH,
        error: "Date of birth must be in YYYY-MM-DD format"
      })
      break
    case DateOfBirthFromStringOutcomeType.INVALID_DATE:
      validationErrors.push({
        name: ValidatedParameter.DATE_OF_BIRTH,
        error: "Date of birth is not a valid date"
      })
      break
    default:
      exhaustive_switch_guard(dateOfBirthValidationOutcome)
  }

  return [dateOfBirth, validationErrors]
}

const validatePostcode = (
  _postcode: string,
  validationErrors: Array<InvalidParameter>
): [Postcode | undefined, Array<InvalidParameter>] => {
  let postcode

  const postcodeValidationOutcome = Postcode.from_string(_postcode)
  switch (postcodeValidationOutcome.type) {
    case PostcodeFromStringOutcomeType.OK:
      postcode = postcodeValidationOutcome.postcode
      break
    case PostcodeFromStringOutcomeType.WILDCARD_TOO_SOON:
      validationErrors.push({
        name: ValidatedParameter.POSTCODE,
        error: "Wildcard cannot be in first 2 characters"
      })
      break
    default:
      exhaustive_switch_guard(postcodeValidationOutcome)
  }

  return [postcode, validationErrors]
}

export {
  PatientSearchOutcome as Outcome,
  PatientSearchOutcomeType as OutcomeType,
  patientSearch,
  PatientSummary
}
