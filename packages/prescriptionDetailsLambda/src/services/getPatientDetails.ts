import * as pds from "@cpt-ui-common/pdsClient"
import axios from "axios"
import {Logger} from "@aws-lambda-powertools/logger"
import {ApigeeConfig, PatientSummary} from "@cpt-ui-common/common-types"
import {exhaustive_switch_guard} from "@cpt-ui-common/lambdaUtils"

const axiosInstance = axios.create()

export const getPatientDetails = async (
  nhsNumber: string, pdsEndpoint: string, apigeeConfig: ApigeeConfig, logger: Logger
): Promise<PatientSummary | undefined> => {

  const pdsClient = new pds.Client(
    axiosInstance,
    new URL(pdsEndpoint),
    logger
  )

  const outcome = await pdsClient
    .with_access_token(apigeeConfig.apigeeAccessToken)
    .with_role_id(apigeeConfig.roleId)
    .with_org_code(apigeeConfig.orgCode)
    .with_correlation_id(apigeeConfig.correlationId)
    .getPatientDetails(nhsNumber)

  let patientDetails = undefined

  switch (outcome.type) {
    case pds.patientDetails.OutcomeType.SUCCESS:
      patientDetails = outcome.patientDetails
      break
    case pds.patientDetails.OutcomeType.SUPERSEDED:
      patientDetails = outcome.patientDetails
      logger.info("NHS Number was superseded", {
        originalNhsNumber: nhsNumber,
        newNhsNumber: outcome.supersededBy
      })
      break
    case pds.patientDetails.OutcomeType.AXIOS_ERROR:
      logger.error("Error fetching patient details from PDS", {
        axios_error: outcome.error,
        nhsNumber: outcome.nhsNumber,
        timeMs: outcome.timeMs
      })
      break
    case pds.patientDetails.OutcomeType.PDS_ERROR:
      logger.error("Error fetching patient details from PDS", {
        statusCode: outcome.statusCode,
        errorResponse: outcome.response,
        nhsNumber: outcome
      })
      break
    case pds.patientDetails.OutcomeType.RESTRICTED:
    case pds.patientDetails.OutcomeType.PATIENT_NOT_FOUND:
    case pds.patientDetails.OutcomeType.PARSE_ERROR:
      throw handlePatientDetailsLookupError(outcome, logger)
    default:
      throw exhaustive_switch_guard(outcome)
  }

  logger.debug("patientDetails", {
    body: patientDetails
  })

  return patientDetails
}

class PDSError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "RESTRICTED" | "PARSE_ERROR" | "PDS_ERROR" | "INCOMPLETE_DATA" = "NOT_FOUND",
    public readonly requiresFallback: boolean = true
  ) {
    super(message)
    this.name = "PDSError"
  }
}

const handlePatientDetailsLookupError = (outcome: pds.patientDetails.Outcome, logger: Logger) => {
  switch (outcome.type) {
    case pds.patientDetails.OutcomeType.PATIENT_NOT_FOUND:
      logger.error("PDS response data is empty", {nhsNumber: outcome.nhsNumber})
      throw new PDSError("Patient not found", "NOT_FOUND")
    case pds.patientDetails.OutcomeType.RESTRICTED:
      logger.info("Patient record marked as restricted", {nhsNumber: outcome.nhsNumber})
      throw new PDSError("Patient not found", "RESTRICTED")
    case pds.patientDetails.OutcomeType.PARSE_ERROR:
      logger.error("PDS response did not contain a valid FHIR message", {errors: outcome.validationErrors})
      throw new PDSError("PDS response invalid", "PARSE_ERROR")
    // Following cases will not be hit
    case pds.patientDetails.OutcomeType.SUCCESS:
    case pds.patientDetails.OutcomeType.SUPERSEDED:
    case pds.patientDetails.OutcomeType.AXIOS_ERROR:
    case pds.patientDetails.OutcomeType.PDS_ERROR:
      throw new Error("Unreachable")
    default:
      throw exhaustive_switch_guard(outcome)
  }
}
