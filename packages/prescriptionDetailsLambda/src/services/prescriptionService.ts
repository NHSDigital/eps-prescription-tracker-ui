
import axios from "axios"

import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"

import {doHSClient} from "@cpt-ui-common/doHSClient"

import {mergePrescriptionDetails} from "../utils/responseMapper"
import {formatHeaders} from "../utils/headerUtils"

import {DoHSData} from "../utils/types"
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
    dispensingOrganization: string | undefined
  },
  logger: Logger
): Promise<DoHSData> {
  // Collect all valid ODS codes into an array
  const validOdsCodes = [
    odsCodes.prescribingOrganization,
    odsCodes.nominatedPerformer,
    odsCodes.dispensingOrganization
  ].filter(Boolean) as Array<string>

  if (validOdsCodes.length === 0) {
    return {
      prescribingOrganization: null,
      nominatedPerformer: null,
      dispensingOrganization: null
    }
  }

  try {
    const orgs = await doHSClient(validOdsCodes)

    if (orgs.length === 0) {
      logger.warn("No organization data found in DoHS response")
    }

    const prescribingOrganization =
      orgs.find((item: {ODSCode: string}) =>
        item.ODSCode.toUpperCase() === odsCodes.prescribingOrganization?.toUpperCase()) ?? null

    const nominatedPerformer =
      orgs.find((item: {ODSCode: string}) =>
        item.ODSCode.toUpperCase() === odsCodes.nominatedPerformer?.toUpperCase()) ?? null

    const dispensingOrganization =
      orgs.find((item: {ODSCode: string}) =>
        item.ODSCode.toUpperCase() === odsCodes.dispensingOrganization?.toUpperCase()) ?? null

    logger.info("Mapped DoHS organizations", {
      prescribingOrganization: prescribingOrganization?.OrganisationName ?? "Not Found",
      nominatedPerformer: nominatedPerformer?.OrganisationName ?? "Not Found",
      dispensingOrganization: dispensingOrganization?.OrganisationName ?? "Not Found"
    })

    return {
      prescribingOrganization,
      nominatedPerformer,
      dispensingOrganization
    }
  } catch (error) {
    logger.error("Failed to fetch DoHS API data", {error})
    return {
      prescribingOrganization: null,
      nominatedPerformer: null,
      dispensingOrganization: null
    }
  }
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

  // Extract issueNumber from query parameters, default to "1" if not provided
  const issueNumber = event.queryStringParameters?.issueNumber || "1"

  logger.info("Fetching prescription details from Apigee", {
    prescriptionId,
    issueNumber
  })

  const endpoint = new URL(apigeePrescriptionsEndpoint)
  endpoint.pathname = path.join(endpoint.pathname, `/RequestGroup/${encodeURIComponent(prescriptionId)}`)

  // Add issueNumber as a query parameter to the Apigee request
  endpoint.searchParams.set("issueNumber", issueNumber)

  const headers = buildApigeeHeaders(apigeeAccessToken, roleId, orgCode, correlationId)

  // Add detailed logging before making the request
  logger.info("Making request to Apigee", {
    url: endpoint.href,
    method: "GET",
    headers: {
      ...headers,
      Authorization: headers.Authorization ? "[REDACTED]" : undefined
    },
    prescriptionId,
    issueNumber
  })

  try {
    const apigeeResponse = await axios.get(endpoint.href, {headers})
    logger.info("Apigee response received successfully", {
      status: apigeeResponse.status,
      statusText: apigeeResponse.statusText,
      dataKeys: Object.keys(apigeeResponse.data || {}),
      prescriptionId,
      issueNumber
    })

    const odsCodes = extractOdsCodes(apigeeResponse.data, logger)
    const doHSData = await getDoHSData(odsCodes, logger)

    logger.info("Merging prescription details fetched from Apigee with data from DoHS", {
      prescriptionDetails: apigeeResponse.data,
      doHSData,
      prescriptionId,
      issueNumber
    })

    try {
      const mergedResponse = mergePrescriptionDetails(apigeeResponse.data, doHSData)

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      logger.warn("Prescription details not found")
      return {
        statusCode: 200,
        body: JSON.stringify({message: "Prescription details not found"})
      }
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
        prescriptionId,
        issueNumber
      })
    } else {
      logger.error("Unexpected error in prescription service", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        prescriptionId,
        issueNumber
      })
    }

    throw error
  }
}
