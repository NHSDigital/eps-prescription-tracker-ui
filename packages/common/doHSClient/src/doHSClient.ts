import {Logger} from "@aws-lambda-powertools/logger"
import axios, {AxiosError, AxiosRequestConfig} from "axios"
import {handleAxiosError} from "./errorUtils"

// Initialize a logger for DoHS Client
const logger = new Logger({serviceName: "doHSClient"})

// Read the DoHS API Key from environment variables
const apigeeApiKey = process.env["apigeeApiKey"] as string
const apigeeDoHSEndpoint = process.env["apigeeDoHSEndpoint"] as string
const apigeePtlDoHSApiKey = process.env["APIGEE_PTL_DOHS_API_KEY"] as string

export const doHSClient = async (
  odsCodes: {
  prescribingOrganization?: string
  nominatedPerformer?: string
  dispensingOrganizations?: Array<string> // Supports multiple dispensing orgs
}) => {
  logger.info("Fetching DoHS API data for ODS codes", {odsCodes})

  // Collect all valid ODS codes into an array
  const validOdsCodes = [
    odsCodes.prescribingOrganization,
    odsCodes.nominatedPerformer,
    ...(odsCodes.dispensingOrganizations || []) // Spread array for multiple dispensing orgs
  ].filter(Boolean) as Array<string>

  if (validOdsCodes.length === 0) {
    throw new Error("At least one ODS Code is required for DoHS API request")
  }

  // Use APIGEE_PTL_DOHS_API_KEY if available, otherwise fall back to apigeeApiKey
  const effectiveApiKey = apigeePtlDoHSApiKey ?? apigeeApiKey
  if (!effectiveApiKey) {
    throw new Error("Apigee API Key environment variable is not set")
  }
  if (!apigeeDoHSEndpoint) {
    throw new Error("DoHS API endpoint environment variable is not set")
  }

  // Construct filter query for multiple ODS codes
  const odsFilter = validOdsCodes.map((code) => `ODSCode eq '${code}'`).join(" or ")

  try {
    const config: AxiosRequestConfig = {
      params: {
        "api-version": "3",
        "$filter": odsFilter
      },
      headers: {"apikey": `${effectiveApiKey}`}
    }

    const response = await axios.get(apigeeDoHSEndpoint, config)
    logger.info("Successfully fetched DoHS API response", {data: response.data})

    // Map DoHS response to correct roles
    const mappedData: Record<string, {ODSCode: string} | null> = {
      prescribingOrganization: response.data.value.find((item: {ODSCode: string}) =>
        item.ODSCode === odsCodes.prescribingOrganization) || null,
      nominatedPerformer: response.data.value.find((item: {ODSCode: string}) =>
        item.ODSCode === odsCodes.nominatedPerformer) || null,
      dispensingOrganizations: response.data.value.filter((item: {ODSCode: string}) =>
        odsCodes.dispensingOrganizations?.includes(item.ODSCode)) || []
    }

    return mappedData
  } catch (error) {
    if (error instanceof AxiosError) {
      const errorMessage = `Failed to fetch data for ODS Codes: ${validOdsCodes.join(", ")}`
      handleAxiosError(error, errorMessage, logger)
    } else {
      logger.error("Unexpected error fetching DoHS API data", {error})
    }
    throw new Error("Error fetching DoHS API data")
  }
}
