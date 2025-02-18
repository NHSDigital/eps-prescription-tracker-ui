import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {Logger} from "@aws-lambda-powertools/logger"
import axios from "axios"

// Initialize a logger for DoHS Client
const logger = new Logger({serviceName: "doHSClient"})

// Read the DoHS API Key ARN from Lambda environment variables
const doHSApiKeyArn = process.env["doHSApiKeyArn"] as string

// Function to fetch the DoHS API Key from AWS Secrets Manager
export const getDoHSApiKey = async (): Promise<string> => {
  if (!doHSApiKeyArn) {
    throw new Error("DoHSApiKey environment variable is not set")
  }

  logger.info("Fetching DoHS API Key from AWS Secrets Manager...")

  try {
    const apiKey = await getSecret(doHSApiKeyArn)
    if (!apiKey || typeof apiKey !== "string") {
      throw new Error("Invalid or missing DoHS API Key")
    }

    logger.info("Successfully fetched DoHS API Key.")
    return apiKey
  } catch (error) {
    logger.error("Failed to fetch DoHS API Key from Secrets Manager", {error})
    throw new Error("Error retrieving DoHS API Key")
  }
}

// Function to make a request to the DoHS API using the secret key
export const doHSClient = async (odsCode: string) => {
  logger.info("Calling DoHS API...", {odsCode})

  if (!odsCode) {
    throw new Error("ODS Code is required for DoHS API request")
  }

  try {
    // Fetch API Key from AWS Secrets Manager
    const apiKey = await getDoHSApiKey()

    // Construct the request URL
    const requestUrl = `https://internal-dev.api.service.nhs.uk/service-search-api/?api-version=3` +
      `&searchFields=ODSCode&search=${odsCode}`

    // Make API request
    const response = await axios.get(requestUrl, {
      headers: {
        "apikey": apiKey // Use the retrieved API key
      }
    })

    logger.info("Successfully fetched data from DoHS API", {data: response.data})
    return response.data
  } catch (error) {
    logger.error("Failed to fetch data from DoHS API", {error})
    throw new Error("Error fetching DoHS API data")
  }
}
