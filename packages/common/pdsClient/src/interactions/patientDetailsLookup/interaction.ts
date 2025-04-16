import {v4 as uuidv4} from "uuid"

import {PatientDetails} from "@cpt-ui-common/common-types"
import * as validatePatientDetails from "./validatePatientDetails"
import {Client} from "../../client"
import {axios_get, AxiosCallOutcomeType} from "../../axios_wrapper"
import {mapPdsResponseToPatientDetails} from "./utils"

enum PatientDetailsLookupOutcomeType {
  SUCCESS = "success",
  AXIOS_ERROR = "axios_error",
  PATIENT_NOT_FOUND = "patient_not_found",
  S_FLAG = "s_flag",
  R_FLAG = "r_flag",
  SUPERSEDED = "superseded",
  PATIENT_DETAILS_VALIDATION_ERROR = "patient_details_validation_error"
}

type PatientDetailsLookupOutcome =
  | { type: PatientDetailsLookupOutcomeType.AXIOS_ERROR, error: Error, nhsNumber: string, timeMs: number }
  | { type: PatientDetailsLookupOutcomeType.SUCCESS, patientDetails: PatientDetails }
  | { type: PatientDetailsLookupOutcomeType.PATIENT_NOT_FOUND, nhsNumber: string }
  | { type: PatientDetailsLookupOutcomeType.S_FLAG, nhsNumber: string }
  | { type: PatientDetailsLookupOutcomeType.R_FLAG, nhsNumber: string }
  | { type: PatientDetailsLookupOutcomeType.SUPERSEDED, patientDetails: PatientDetails, supersededBy: string }
  | {
      type: PatientDetailsLookupOutcomeType.PATIENT_DETAILS_VALIDATION_ERROR,
      error: validatePatientDetails.InvalidOutcomes,
      patientDetails: PatientDetails,
      nhsNumber: string
    }

async function getPatientDetails(
  client: Client,
  nhsNumber: string
): Promise<PatientDetailsLookupOutcome> {
  const api_call = await axios_get(
    client.axiosInstance,
    client.logger,
    client.patientDetailsPath(nhsNumber),
    {
      Accept: "application/fhir+json",
      Authorization: `Bearer ${client.apigeeAccessToken}`,
      "NHSD-End-User-Organisation-ODS": "A83008",
      "NHSD-Session-URID": client.roleId,
      "X-Request-ID": uuidv4(),
      "X-Correlation-ID": uuidv4()
    },
    {nhsNumber})
  if (api_call.type === AxiosCallOutcomeType.ERROR){
    return {
      type: PatientDetailsLookupOutcomeType.AXIOS_ERROR,
      error: api_call.error,
      nhsNumber: nhsNumber,
      timeMs: api_call.timeMs
    }
  }
  const data = api_call.data

  if (!data) {
    return {type: PatientDetailsLookupOutcomeType.PATIENT_NOT_FOUND, nhsNumber}
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checkForFlag = (data: any, flag: string) => {
    return data.meta?.security?.some((s: { code: string }) => s.code === flag)
  }

  // Check specifically for S flag first
  if (checkForFlag(data, "S")) {
    return {type: PatientDetailsLookupOutcomeType.S_FLAG, nhsNumber}
  }
  // Check for R flag
  if(checkForFlag(data, "R")){
    return {type: PatientDetailsLookupOutcomeType.R_FLAG, nhsNumber}
  }

  const patientDetails = mapPdsResponseToPatientDetails(data)

  // Handle superseded NHS numbers
  if (data.id !== nhsNumber) {
    return {
      type: PatientDetailsLookupOutcomeType.SUPERSEDED,
      patientDetails,
      supersededBy: data.id
    }
  }

  const validationOutcome = validatePatientDetails.validate(patientDetails)
  switch (validationOutcome.type) {
    case validatePatientDetails.OutcomeType.VALID:
      return {
        type: PatientDetailsLookupOutcomeType.SUCCESS,
        patientDetails
      }
    case validatePatientDetails.OutcomeType.MISSING_FIELDS:
    case validatePatientDetails.OutcomeType.NOT_NULL_WHEN_NOT_PRESENT:
      return {
        type: PatientDetailsLookupOutcomeType.PATIENT_DETAILS_VALIDATION_ERROR,
        error: validationOutcome,
        patientDetails,
        nhsNumber
      }
  }
}

export {
  PatientDetailsLookupOutcome as Outcome,
  PatientDetailsLookupOutcomeType as OutcomeType,
  getPatientDetails
}
