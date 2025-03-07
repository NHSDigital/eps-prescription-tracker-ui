import {Logger} from "@aws-lambda-powertools/logger"
import axios, {AxiosError, AxiosRequestConfig} from "axios"
import {handleAxiosError} from "./errorUtils"

// Initialize a logger for DoHS Client
const logger = new Logger({serviceName: "doHSClient"})

// Read the DoHS API Key from environment variables
const apigeeApiKey = process.env["apigeeApiKey"] as string

export const doHSClient = async (odsCodes: {
  prescribingOrganization?: string
  nominatedPerformer?: string
  dispensingOrganization?: string
}) => {
  logger.info("Fetching DoHS API data for ODS codes", {odsCodes})

  // Filter out empty values
  const filteredOdsCodes = Object.entries(odsCodes)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([_, value]) => value)
    .map(([key, value]) => ({key, value}))

  if (filteredOdsCodes.length === 0) {
    throw new Error("At least one ODS Code is required for DoHS API request")
  }

  if (!apigeeApiKey) {
    throw new Error("DoHS API Key environment variable is not set")
  }

  // Construct filter query
  const odsFilter = filteredOdsCodes.map(({value}) => `ODSCode eq '${value}'`).join(" or ")
  const requestUrl = `https://internal-dev.api.service.nhs.uk/service-search-api/?api-version=3&$filter=${odsFilter}`

  try {
    const config: AxiosRequestConfig = {
      headers: {"apikey": apigeeApiKey}
    }

    const response = await axios.get(requestUrl, config)
    logger.info("Successfully fetched DoHS API response", {data: response.data})

    // Map DoHS response to correct roles
    const mappedData: Record<string, {ODSCode: string} | null> = filteredOdsCodes.reduce(
      (acc, {key, value}) => ({
        ...acc,
        [key]: response.data.value.find((item: {ODSCode: string}) => item.ODSCode === value) || null
      }),
      {}
    )

    return mappedData
  } catch (error) {
    if (error instanceof AxiosError) {
      const errorMessage = `Failed to fetch data for ODS Codes: ${filteredOdsCodes
        .map(({value}) => value)
        .join(", ")}. Request URL: ${requestUrl}. Status: ${error?.response?.status}, Message: ${error?.message}`
      handleAxiosError(error, errorMessage, logger)
    } else {
      logger.error("Unexpected error fetching DoHS API data", {error})
    }
    throw new Error("Error fetching DoHS API data")
  }
}
