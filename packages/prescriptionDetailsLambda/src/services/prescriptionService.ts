
import axios from "axios"

import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"

import {doHSClient} from "@cpt-ui-common/doHSClient"

import {mergePrescriptionDetails} from "../utils/responseMapper"
import {formatHeaders} from "../utils/headerUtils"

import {DoHSData, DoHSValue} from "../utils/types"
import {buildApigeeHeaders} from "@cpt-ui-common/authFunctions"
import path from "path"
import {extractOdsCodes} from "../utils/extensionUtils"

/**
 * Fetch DoHS data and map it to the expected structure.
 */
export async function getDoHSData(
  odsCodes: {
    prescribingOrganization: string | undefined
    nominatedPerformer: string | undefined
    dispensingOrganizations: Array<string> | undefined
  },
  logger: Logger
): Promise<DoHSData> {
  let doHSData: DoHSData = {
    prescribingOrganization: null,
    nominatedPerformer: null,
    dispensingOrganizations: []
  }

  if (Object.values(odsCodes).some(Boolean)) {
    try {
      const rawDoHSData = (await doHSClient(odsCodes)) as {
        prescribingOrganization?: DoHSValue
        nominatedPerformer?: DoHSValue
        dispensingOrganizations?: Array<DoHSValue>
      }

      logger.info("Successfully fetched DoHS API data", {rawDoHSData})

      if (!rawDoHSData?.prescribingOrganization &&
        !rawDoHSData?.nominatedPerformer &&
        !rawDoHSData?.dispensingOrganizations?.length) {
        logger.warn("No organization data found in DoHS response", {rawDoHSData})
      }

      // Assign prescribing organization
      doHSData.prescribingOrganization =
        rawDoHSData?.prescribingOrganization?.ODSCode?.toUpperCase() === odsCodes.prescribingOrganization?.toUpperCase()
          ? rawDoHSData.prescribingOrganization
          : null

      // Assign nominated performer
      doHSData.nominatedPerformer =
        rawDoHSData?.nominatedPerformer?.ODSCode?.toUpperCase() === odsCodes.nominatedPerformer?.toUpperCase()
          ? rawDoHSData.nominatedPerformer
          : null

      // Assign multiple dispensing organizations
      doHSData.dispensingOrganizations =
        rawDoHSData?.dispensingOrganizations?.filter(org =>
          odsCodes.dispensingOrganizations?.some(ods => ods.toUpperCase() === org.ODSCode?.toUpperCase())
        ) ?? []

      // Logging Variables
      const prescribingOrganization = doHSData.prescribingOrganization
        ? doHSData.prescribingOrganization.OrganisationName
        : "Not Found"

      const nominatedPerformer = doHSData.nominatedPerformer
        ? doHSData.nominatedPerformer.OrganisationName
        : "Not Found"

      const dispensingOrganizations = doHSData.dispensingOrganizations.length
        ? doHSData.dispensingOrganizations.map(org => org.OrganisationName)
        : "Not Found"

      // Log results
      logger.info("Mapped DoHS organizations", {
        prescribingOrganization,
        nominatedPerformer,
        dispensingOrganizations
      })

    } catch (error) {
      logger.error("Failed to fetch DoHS API data", {error})
      doHSData = {
        prescribingOrganization: null,
        nominatedPerformer: null,
        dispensingOrganizations: []
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
  orgCode: string,
  correlationId: string,
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
  const endpoint = new URL(apigeePrescriptionsEndpoint)
  endpoint.pathname = path.join(endpoint.pathname, `/RequestGroup/${encodeURIComponent(prescriptionId)}`)
  const headers = buildApigeeHeaders(apigeeAccessToken, roleId, orgCode, correlationId)

  // Add detailed logging before making the request
  logger.info("Making request to Apigee", {
    url: endpoint.href,
    method: "GET",
    headers: {
      ...headers,
      Authorization: headers.Authorization ? "[REDACTED]" : undefined
    },
    prescriptionId
  })

  try {
    const apigeeResponse = await axios.get(endpoint.href, {headers})
    logger.info("Apigee response received successfully", {
      status: apigeeResponse.status,
      statusText: apigeeResponse.statusText,
      dataKeys: Object.keys(apigeeResponse.data || {}),
      prescriptionId
    })

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

    // return {
    //   statusCode: 200,
    //   body: JSON.stringify(mergedResponse),
    //   headers: formatHeaders(apigeeResponse.headers)
    // }
    const responseHeaders = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...apigeeResponse.headers as { [key: string]: string }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(mergedResponse),
      headers: formatHeaders(responseHeaders)
    }

  } catch (error) {
    // Enhanced error logging for axios errors, then re-throw to let middy handle
    if (axios.isAxiosError(error)) {
      logger.error("Axios request failed", {
        url: endpoint.href,
        method: "GET",
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers,
        requestHeaders: {
          ...headers,
          Authorization: headers.Authorization ? "[REDACTED]" : undefined
        },
        errorMessage: error.message,
        prescriptionId
      })
    } else {

      logger.error("Unexpected error in prescription service", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        prescriptionId
      })
    }

    throw error
  }
}
