
import {Client} from "client"
import {
  FamilyName,
  FamilyNameFromStringOutcomeType,
  DateOfBirth,
  DateOfBirthFromStringOutcomeType,
  Postcode,
  PostcodeFromStringOutcomeType,
  ValidatedParameter,
  PatientSearchParameters
} from "./types"
import {exhaustive_switch_guard} from "../../utils"
import * as axios from "../../axios_wrapper"
import {AxiosResponse} from "axios"
import {v4 as uuidv4} from "uuid"
import {
  PatientAddressUse,
  PatientMetaCode,
  PatientNameUse,
  ResponseType,
  ResponseValidator,
  SuccessfulResponse,
  UnrestrictedPatientResource
} from "./schema"
import {ErrorObject} from "ajv"
import {PatientSummary} from "@cpt-ui-common/common-types"

enum PatientSearchOutcomeType {
  SUCCESS = "SUCCESS",
  INVALID_PARAMETERS = "INVALID_PARAMETERS",
  AXIOS_ERROR = "AXIOS_ERROR",
  RESPONSE_PARSE_ERROR = "RESPONSE_PARSE_ERROR",
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
  | { type: PatientSearchOutcomeType.RESPONSE_PARSE_ERROR,
      response: AxiosResponse,
      validationErrors: Array<ErrorObject>
    }
  | { type: PatientSearchOutcomeType.TOO_MANY_MATCHES, searchParameters: PatientSearchParameters }
  | { type:PatientSearchOutcomeType.PDS_ERROR, response: AxiosResponse }

async function patientSearch(
  client: Client,
  _familyName: string,
  _dateOfBirth: string,
  _postcode: string
): Promise<PatientSearchOutcome> {
  // Input validation
  let validationErrors: Array<InvalidParameter> = []
  let familyName
  let dateOfBirth
  let postcode

  [familyName, validationErrors] = validateFamilyName(_familyName, validationErrors);
  [dateOfBirth, validationErrors] = validateDateOfBirth(_dateOfBirth, validationErrors);
  [postcode, validationErrors] = validatePostcode(_postcode, validationErrors)
  if (validationErrors.length > 0) {
    return {
      type: PatientSearchOutcomeType.INVALID_PARAMETERS,
      validationErrors
    }
  }

  // API call
  const searchParameters: PatientSearchParameters = {
    familyName: familyName as FamilyName,
    dateOfBirth: dateOfBirth as DateOfBirth,
    postcode: postcode as Postcode
  }
  const url = client.patientSearchPath(
    searchParameters
  )
  const headers = {
    Accept: "application/fhir+json",
    Authorization: `Bearer ${client.apigeeAccessToken}`,
    "NHSD-End-User-Organisation-ODS": "A83008",
    "NHSD-Session-URID": client.roleId,
    "X-Request-ID": uuidv4(),
    "X-Correlation-ID": uuidv4()
  }
  const api_call = await client.axios_get(
    url,
    headers
  )
  if (api_call.type === axios.OutcomeType.ERROR) {
    return {
      type: PatientSearchOutcomeType.AXIOS_ERROR,
      error: api_call.error,
      url,
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

  const responseValidator = new ResponseValidator()
  const isValidResponse = responseValidator.validate(data)
  if (!isValidResponse) {
    return {
      type: PatientSearchOutcomeType.RESPONSE_PARSE_ERROR,
      response,
      validationErrors: responseValidator.validationErrors()
    }
  }
  // Check for too many matches
  // (Response is a 200, and the body is an OperationOutcome.
  // Response body is either a bundle or a
  // too many matches operation outcome verified from schema)
  if(data.resourceType === ResponseType.OPERATION_OUTCOME){
    return {
      type: PatientSearchOutcomeType.TOO_MANY_MATCHES,
      searchParameters
    }
  }

  // Check for empty response
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
    .map((entry) => entry.resource as UnrestrictedPatientResource)
    .map(parseResource)

  return {
    type: PatientSearchOutcomeType.SUCCESS,
    patients
  }
}

const validateFamilyName = (
  _familyName: string,
  validationErrors: Array<InvalidParameter>
): [FamilyName | undefined, Array<InvalidParameter>] => {
  let familyName

  const familyNameValidationOutcome = FamilyName.from_string(_familyName)
  switch (familyNameValidationOutcome.type) {
    case FamilyNameFromStringOutcomeType.OK:
      familyName = familyNameValidationOutcome.familyName
      break
    case FamilyNameFromStringOutcomeType.TOO_LONG:
      validationErrors.push({
        name: ValidatedParameter.FAMILY_NAME,
        error: "Family name can be at most 35 characters"
      })
      break
    case FamilyNameFromStringOutcomeType.WILDCARD_TOO_SOON:
      validationErrors.push({
        name: ValidatedParameter.FAMILY_NAME,
        error: "Wildcard cannot be in first 2 characters"
      })
      break
    default:
      exhaustive_switch_guard(familyNameValidationOutcome)
  }

  return [familyName, validationErrors]
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

const parseResource = (resource: UnrestrictedPatientResource): PatientSummary => {
  const nhsNumber = resource.id
  const gender = resource.gender
  const dateOfBirth = resource.birthDate

  // Find the usual name (validated in the schema to be present)
  const usualName = resource.name.find((name) => name.use === PatientNameUse.USUAL)!
  const familyName = usualName.family
  const givenName = usualName.given

  // Find the home address (validated in the schema to be present)
  const homeAddress = resource.address.find((address) => address.use === PatientAddressUse.HOME)!
  const address = homeAddress.line
  const postcode = homeAddress.postalCode

  return {
    nhsNumber,
    gender,
    dateOfBirth,
    familyName,
    givenName,
    address,
    postcode
  }
}

export {
  PatientSearchOutcome as Outcome,
  PatientSearchOutcomeType as OutcomeType,
  patientSearch,
  PatientSummary
}
