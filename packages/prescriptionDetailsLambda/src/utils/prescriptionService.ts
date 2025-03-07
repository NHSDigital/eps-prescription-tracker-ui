import axios from "axios"
import {v4 as uuidv4} from "uuid"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {doHSClient} from "@cpt-ui-common/doHSClient"
import {mergePrescriptionDetails} from "./responseMapper"
import {formatHeaders} from "./headerUtils"
import {
  ApigeeDataResponse,
  FhirAction,
  FhirParticipant,
  DoHSData,
  DoHSValue
} from "./types"

/**
 * Build the headers needed for the Apigee request.
 */
export function buildApigeeHeaders(apigeeAccessToken: string, roleId: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apigeeAccessToken}`,
    "nhsd-session-urid": roleId,
    "nhsd-organization-uuid": "A83008", // FIXME: should these be pulled from the environment?
    "nhsd-identity-uuid": "123456123456",
    "nhsd-session-jobrole": "123456123456",
    "x-request-id": uuidv4()
  }
}

/**
 * Extract ODS codes from the Apigee response.
 */
export function extractOdsCodes(apigeeData: ApigeeDataResponse, logger: Logger): {
  prescribingOrganization: string | undefined;
  nominatedPerformer: string | undefined;
  dispensingOrganization: string | undefined;
} {
  const prescribingOrganization = apigeeData?.author?.identifier?.value || undefined

  const nominatedPerformer = apigeeData?.action
    ?.find((action: FhirAction) =>
      action.participant?.some((participant: FhirParticipant) =>
        participant.identifier?.system === "https://fhir.nhs.uk/Id/ods-organization-code"
      )
    )?.participant?.[0]?.identifier?.value || undefined

  const dispensingOrganization = apigeeData?.action
    ?.find((action: FhirAction) =>
      action.participant?.some((participant: FhirParticipant) =>
        participant.identifier?.system === "https://fhir.nhs.uk/Id/ods-organization-code"
      )
    )?.participant?.[0]?.identifier?.value || undefined

  logger.info("Extracted ODS codes from Apigee", {prescribingOrganization, nominatedPerformer, dispensingOrganization})

  return {
    prescribingOrganization,
    nominatedPerformer,
    dispensingOrganization
  }
}

/**
 * Fetch DoHS data and map it to the expected structure.
 */
export async function getDoHSData(
  odsCodes: {
    prescribingOrganization: string | undefined;
    nominatedPerformer: string | undefined;
    dispensingOrganization: string | undefined
  },
  logger: Logger
): Promise<DoHSData> {
  let doHSData: DoHSData = {
    prescribingOrganization: null,
    nominatedPerformer: null,
    dispensingOrganization: null
  }

  if (Object.values(odsCodes).some(Boolean)) {
    try {
      const rawDoHSData = (await doHSClient(odsCodes)) as { value?: Array<DoHSValue> }
      logger.info("Successfully fetched DoHS API data", {rawDoHSData})

      if (!Array.isArray(rawDoHSData.value) || rawDoHSData.value.length === 0) {
        logger.warn("No organization data found in DoHS response", {rawDoHSData})
      }

      doHSData.prescribingOrganization = rawDoHSData?.value?.find(
        (org: DoHSValue) => org.ODSCode === odsCodes.prescribingOrganization
      ) || null

      doHSData.nominatedPerformer = rawDoHSData?.value?.find(
        (org: DoHSValue) => org.ODSCode === odsCodes.nominatedPerformer
      ) || null

      doHSData.dispensingOrganization = rawDoHSData?.value?.find(
        (org: DoHSValue) => org.ODSCode === odsCodes.dispensingOrganization
      ) || null

      // Log the results
      const prescribingOrganization = doHSData.prescribingOrganization ?
        doHSData.prescribingOrganization.OrganisationName :
        "Not Found"
      const nominatedPerformer = doHSData.nominatedPerformer ?
        doHSData.nominatedPerformer.OrganisationName :
        "Not Found"
      const dispensingOrganization = doHSData.dispensingOrganization ?
        doHSData.dispensingOrganization.OrganisationName :
        "Not Found"

      logger.info("Mapped DoHS organizations", {
        prescribingOrganization,
        nominatedPerformer,
        dispensingOrganization
      })
    } catch (error) {
      logger.error("Failed to fetch DoHS API data", {error})
      doHSData = {
        prescribingOrganization: null,
        nominatedPerformer: null,
        dispensingOrganization: null
      }
    }
  }

  return doHSData
}

/**
 * Entry function for the prescription request processing.
 * Returns the complete response for the lambda handler to give back.
 */
export async function processPrescriptionRequest(
  event: APIGatewayProxyEvent,
  apigeePrescriptionsEndpoint: string,
  apigeeAccessToken: string,
  roleId: string,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const prescriptionId = event.pathParameters?.prescriptionId
  if (!prescriptionId) {
    logger.warn("No prescription ID provided in request", {event})
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing prescription ID in request",
        prescriptionId: null
      })
    }
  }

  logger.info("Fetching prescription details from Apigee", {prescriptionId})
  const requestUrl = `${apigeePrescriptionsEndpoint}RequestGroup/${prescriptionId}`
  const headers = buildApigeeHeaders(apigeeAccessToken, roleId)

  const apigeeResponse = await axios.get(requestUrl, {headers})
  logger.info("Apigee response:", {apigeeResponse})

  const odsCodes = extractOdsCodes(apigeeResponse.data, logger)
  const doHSData = await getDoHSData(odsCodes, logger)

  logger.info("Merging prescription details fetched from Apigee with data from DoHS", {
    prescriptionDetails: apigeeResponse.data,
    doHSData
  })

  let mergedResponse

  try {
    mergedResponse = mergePrescriptionDetails(apigeeResponse.data, doHSData)
  } catch {
    logger.warn("Prescription details not found")
    mergedResponse = {message: "Prescription details not found"}
  }

  return {
    statusCode: 200,
    body: JSON.stringify(mergedResponse),
    headers: formatHeaders(apigeeResponse.headers)
  }
}
