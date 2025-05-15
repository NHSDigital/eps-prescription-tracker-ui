import {AxiosInstance} from "axios"
import {v4 as uuidv4} from "uuid"
import {PrescriptionAPIResponse} from "@cpt-ui-common/common-types"
import {Logger} from "@aws-lambda-powertools/logger"
import {mapResponseToPrescriptionSummary} from "../utils/responseMapper"
import {Bundle, FhirResource} from "fhir/r4"

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
  const endpoint = `${prescriptionsEndpoint}/RequestGroup?${searchParam}`
  const logContext = prescriptionId ? {prescriptionId} : {nhsNumber}

  logger.info("Fetching prescriptions", logContext)
  // TODO: Look at multiple headers with the same value
  const response = await axiosInstance.get(
    endpoint,
    {
      headers: {
        Accept: "application/fhir+json",
        Authorization: `Bearer ${apigeeAccessToken}`,
        "nhsd-session-urid": roleId,
        "x-request-id": uuidv4(),
        "nhsd-session-jobrole": roleId,
        "nhsd-identity-uuid": roleId,
        "nhsd-organization-uuid": "A83008"
      }
    }
  )

  if (!response.data) {
    logger.info("No data returned from prescription lookup", logContext)
    return []
  }

  const bundle = response.data as Bundle<FhirResource>
  logger.debug("Raws response bundle", {bundle})

  return mapResponseToPrescriptionSummary(bundle)
}
