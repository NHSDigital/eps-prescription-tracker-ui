
import axios from "axios"

import {Logger} from "@aws-lambda-powertools/logger"

import {doHSClient} from "@cpt-ui-common/doHSClient"

import {mergePrescriptionDetails} from "../utils/responseMapper"

import {DoHSData} from "../utils/types"
import path from "path"
import {extractOdsCodes, PrescriptionOdsCodes} from "../utils/extensionUtils"
import {ApigeeConfig, PrescriptionDetailsResponse} from "@cpt-ui-common/common-types"
import {getPatientDetails} from "./getPatientDetails"

import {buildApigeeHeaders} from "@cpt-ui-common/authFunctions"

/**
 * Fetch DoHS data and map it to the expected structure.
 */
export async function getDoHSData(
  odsCodes: PrescriptionOdsCodes,
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
    const orgs = await doHSClient(validOdsCodes, logger)

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
interface ApigeeEndpoints {
  prescriptionsEndpoint: string,
  personalDemographicsEndpoint: string
}
export async function processPrescriptionRequest(
  prescriptionId: string,
  issueNumber: string,
  {prescriptionsEndpoint, personalDemographicsEndpoint}: ApigeeEndpoints,
  {apigeeAccessToken, roleId, orgCode, correlationId}: ApigeeConfig,
  logger: Logger
): Promise<PrescriptionDetailsResponse> {
  logger.info("Fetching prescription details from Apigee", {
    prescriptionId,
    issueNumber
  })

  const apigeeHeaders = buildApigeeHeaders(apigeeAccessToken, roleId, orgCode, correlationId)
  const endpoint = new URL(prescriptionsEndpoint)
  endpoint.pathname = path.join(endpoint.pathname, `/RequestGroup/${prescriptionId}`)

  // Add issueNumber as a query parameter to the Apigee request
  endpoint.searchParams.set("issueNumber", issueNumber)

  // Add detailed logging before making the request
  logger.info("Making request to Apigee", {
    url: endpoint.href,
    method: "GET",
    headers: {
      ...apigeeHeaders,
      Authorization: apigeeHeaders.Authorization ? "[REDACTED]" : undefined
    },
    prescriptionId,
    issueNumber
  })

  const apigeeResponse = await axios.get(endpoint.href, {headers: apigeeHeaders})
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
  const prescriptionDetails = mergePrescriptionDetails(apigeeResponse.data, doHSData, odsCodes, logger)

  const patientDetails = await getPatientDetails(
    prescriptionDetails.patientDetails.nhsNumber,
    personalDemographicsEndpoint, {
      apigeeAccessToken,
      roleId,
      orgCode,
      correlationId
    }, logger)

  if (patientDetails){
    logger.info("Overriding patient details with those from PDS")
    prescriptionDetails.patientDetails = patientDetails
    prescriptionDetails.patientFallback = false
  }

  return prescriptionDetails
}
