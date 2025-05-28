import {Logger} from "@aws-lambda-powertools/logger"
import axios, {AxiosError, AxiosRequestConfig} from "axios"
import {handleAxiosError} from "./errorUtils"

// Initialize a logger for DoHS Client
const logger = new Logger({serviceName: "doHSClient"})

// Read the DoHS API Key from environment variables
const apigeeApiKey = process.env["apigeeApiKey"] as string
const apigeeDoHSEndpoint = process.env["apigeeDoHSEndpoint"] as string

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
  if (!apigeeApiKey) {
    throw new Error("Apigee API Key environment variable is not set")
  }
  if (!apigeeDoHSEndpoint) {
    throw new Error("DoHS API endpoint environment variable is not set")
  }

  // Construct filter query for multiple ODS codes
  const odsFilter = validOdsCodes.map((code) => `ODSCode eq '${code}'`).join(" or ")
  const requestUrl = `${apigeeDoHSEndpoint}&$filter=${odsFilter}`

  try {
    const config: AxiosRequestConfig = {
      headers: {"apikey": `${apigeeApiKey}`}
    }

    const response = await axios.get(requestUrl, config)
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
      const errorMessage = `Failed to fetch data for ODS Codes: ${validOdsCodes.join(", ")}. ` +
        `Request URL: ${requestUrl}. Status: ${error?.response?.status}, Message: ${error?.message}`
      handleAxiosError(error, errorMessage, logger)
    } else {
      logger.error("Unexpected error fetching DoHS API data", {error})
    }
    throw new Error("Error fetching DoHS API data")
  }
}
