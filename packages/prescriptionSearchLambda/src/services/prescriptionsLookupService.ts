import {AxiosInstance} from "axios"
import {v4 as uuidv4} from "uuid"
import {PrescriptionAPIResponse} from "../types"
import {Logger} from "@aws-lambda-powertools/logger"
import {mapResponseToPrescriptionSummary} from "../utils/responseMapper"
import {Bundle, FhirResource} from "fhir/r4"
import {PrescriptionError} from "../utils/errors"

type PrescriptionQuery = {
  prescriptionId?: string;
  nhsNumber?: string;
}

/**
 * Fetches prescriptions by either Prescription ID or NHS Number
 */
export const getPrescriptions = async (
  axiosInstance: AxiosInstance,
  logger: Logger,
  prescriptionsEndpoint: string,
  query: PrescriptionQuery,
  apigeeAccessToken: string,
  roleId: string
): Promise<Array<PrescriptionAPIResponse>> => {
  const {prescriptionId, nhsNumber} = query
  const searchParam = prescriptionId ? `prescriptionId=${prescriptionId}` : `nhsNumber=${nhsNumber}`
  //TODO: fix this path before merge
  // const endpoint = `${prescriptionsEndpoint}/clinical-prescription-tracker-pr-808/RequestGroup?${searchParam}`
  const endpoint = `${prescriptionsEndpoint}/clinical-prescription-tracker-pr-808/RequestGroup?${searchParam}`
  const logContext = prescriptionId ? {prescriptionId} : {nhsNumber}

  logger.info("Fetching prescriptions", logContext)

  try {
    const response = await axiosInstance.get(
      endpoint,
      {
        headers: {
          Accept: "application/fhir+json",
          Authorization: `Bearer ${apigeeAccessToken}`,
          "nhsd-session-urid": roleId,
          "x-request-id": uuidv4(),
          //TODO: investigate what the jobrole should be. It is currently hardcoded
          "nhsd-session-jobrole": roleId,
          "nhsd-organization-uuid": "A83008"
        }
      }
    )

    if (!response.data) {
      logger.info("No data returned from prescription lookup", logContext)
      if (prescriptionId) {
        throw new PrescriptionError("Prescription not found")
      }
      return []
    }

    const bundle = response.data as Bundle<FhirResource>
    logger.info("Raws response bundle", {bundle})
    const prescriptions = mapResponseToPrescriptionSummary(bundle)

    if (prescriptionId && (!prescriptions || prescriptions.length === 0)) {
      logger.warn("No prescriptions found in response", logContext)
      throw new PrescriptionError("Prescription not found")
    }

    return prescriptions

  } catch (error) {
    logger.error("Error fetching prescriptions", {...logContext, error})
    if (error instanceof PrescriptionError) {
      throw error
    }
    throw new PrescriptionError(
      prescriptionId
        ? "Failed to fetch prescription details"
        : "Failed to fetch prescriptions"
    )
  }
}

export {PrescriptionError}
