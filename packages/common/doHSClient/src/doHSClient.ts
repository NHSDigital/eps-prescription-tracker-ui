import {Logger} from "@aws-lambda-powertools/logger"
import axios from "axios"
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

  try {
    // Construct the request URL
    const requestUrl = `https://internal-dev.api.service.nhs.uk/service-search-api/?api-version=3` +
      `&$filter=true&searchFields=ODSCode&search=${odsCode}`

    // Make API request
    const response = await axios.get(requestUrl, {
      headers: {
        "apikey": "123456789"
      }
    })

    logger.info("Successfully fetched data from DoHS API", {data: response.data})
    return response.data

  } catch (error) {
    // Use handleAxiosError to redact secrets
    handleAxiosError(error, "Failed to fetch data from DoHS API", logger)
    throw new Error("Error fetching DoHS API data")
  }
}
