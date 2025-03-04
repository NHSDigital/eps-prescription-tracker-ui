import {Logger} from "@aws-lambda-powertools/logger"
import axios, {AxiosError, AxiosRequestConfig} from "axios"
import {handleAxiosError} from "./errorUtils"

// Initialize a logger for DoHS Client
const logger = new Logger({serviceName: "doHSClient"})

// Read the DoHS API Key directly from environment variables
const apigeeApiKey = process.env["apigeeApiKey"] as string

// Function to make a request to the DoHS API
export const doHSClient = async (odsCode: string) => {
  logger.info("Calling DoHS API...", {odsCode})

  if (!odsCode) {
    throw new Error("ODS Code is required for DoHS API request")
  }

  if (!apigeeApiKey) {
    throw new Error("DoHS API Key environment variable is not set")
  }

  // Construct the request URL
  const requestUrl = `https://internal-dev.api.service.nhs.uk/service-search-api/?api-version=3` +
    `&$filter=true&searchFields=ODSCode&search=${odsCode}`

  try {
    // Define Axios request configuration
    const config: AxiosRequestConfig = {
      headers: {
        "apikey": apigeeApiKey
      }
    }

    // Make API request
    const response = await axios.get(requestUrl, config)

    logger.info("Successfully fetched DoHS API response in client", {data: response.data})
    return response.data

  } catch (error) {
    // Use handleAxiosError to redact secrets
    if (error instanceof AxiosError) {
      const errorMessage = `Failed to fetch data for ODS Code: ${odsCode}. ` +
        `Request URL: ${requestUrl}. ` +
        `Status: ${error?.response?.status}, ` +
        `Message: ${error?.message}`
      handleAxiosError(error, errorMessage, logger)
    } else {
      logger.error("Unexpected error", {error})
    }
    throw new Error("Error fetching DoHS API data")
  }
}
