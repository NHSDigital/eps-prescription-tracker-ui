import {PatientSummary} from "@cpt-ui-common/common-types"
import {ErrorObject} from "ajv"
import {AxiosResponse} from "axios"
import * as axios from "../../axios_wrapper"
import {Client} from "../../client"
import {parsePatient} from "../../parsePatient"
import {PatientMetaCode, UnrestrictedPatient} from "../../schema/patient"
import {ResponseValidator} from "../../schema/responseValidator"
import {PDSPatientDetailsResponse, pdsPatientDetailsResponseSchema} from "./schema"

enum PatientDetailsOutcomeType {
  SUCCESS = "SUCCESS",
  PATIENT_NOT_FOUND = "PATIENT_NOT_FOUND",
  SUPERSEDED = "SUPERSEDED",
  RESTRICTED = "RESTRICTED",
  AXIOS_ERROR = "AXIOS_ERROR",
  PDS_ERROR = "PDS_ERROR",
  PARSE_ERROR = "PARSE_ERROR"
}

type PatientDetailsOutcome =
  | { type: PatientDetailsOutcomeType.SUCCESS, patientDetails: PatientSummary }
  | { type: PatientDetailsOutcomeType.PATIENT_NOT_FOUND, nhsNumber: string }
  | { type: PatientDetailsOutcomeType.SUPERSEDED, patientDetails: PatientSummary, supersededBy: string }
  | { type: PatientDetailsOutcomeType.RESTRICTED, nhsNumber: string}
  | { type: PatientDetailsOutcomeType.AXIOS_ERROR, error: Error, nhsNumber: string, timeMs: number }
  | { type: PatientDetailsOutcomeType.PDS_ERROR, statusCode: number, response: AxiosResponse, nhsNumber: string}
  | { type: PatientDetailsOutcomeType.PARSE_ERROR, response: AxiosResponse, validationErrors: Array<ErrorObject>}

async function getPatientDetails(
  client: Client,
  nhsNumber: string
): Promise<PatientDetailsOutcome> {
  // API Call
  const url = client.patientDetailsPath(nhsNumber)

  const api_call = await client.axios_get(url, {nhsNumber})
  if (api_call.type === axios.OutcomeType.ERROR){
    return {
      type: PatientDetailsOutcomeType.AXIOS_ERROR,
      error: api_call.error,
      nhsNumber: nhsNumber,
      timeMs: api_call.timeMs
    }
  }
  const response = api_call.response
  const data = api_call.data

  // Check for response errors
  if (response.status !== 200 && response.status !== 404) {
    return {
      type: PatientDetailsOutcomeType.PDS_ERROR,
      statusCode: response.status,
      response,
      nhsNumber
    }
  }

  if (!data || response.status === 404) {
    return {type: PatientDetailsOutcomeType.PATIENT_NOT_FOUND, nhsNumber}
  }

  // Log the data structure to help debug mapping issues
  client.logger.debug("PDS response data structure", {
    resourceType: data.resourceType,
    id: data.id,
    hasIdentifier: !!data.identifier,
    hasMeta: !!data.meta,
    hasName: !!data.name && Array.isArray(data.name),
    nameCount: data.name?.length,
    hasSecurity: !!data.meta?.security
  })

  const responseValidator = new ResponseValidator<PDSPatientDetailsResponse>(pdsPatientDetailsResponseSchema)
  const isValidResponse = responseValidator.validate(data)
  if (!isValidResponse){
    return {
      type: PatientDetailsOutcomeType.PARSE_ERROR,
      response,
      validationErrors: responseValidator.validationErrors()
    }
  }

  // Check for any restricted flags
  if (data.meta.security[0].code !== PatientMetaCode.UNRESTRICTED) {
    return {type: PatientDetailsOutcomeType.RESTRICTED, nhsNumber}
  }

  const patientDetails = parsePatient(data as UnrestrictedPatient)

  if (patientDetails.nhsNumber !== nhsNumber){
    return {
      type: PatientDetailsOutcomeType.SUPERSEDED,
      patientDetails,
      supersededBy: patientDetails.nhsNumber
    }
  }

  return {
    type: PatientDetailsOutcomeType.SUCCESS,
    patientDetails
  }
}

export {
  getPatientDetails, PatientDetailsOutcome as Outcome,
  PatientDetailsOutcomeType as OutcomeType
}
