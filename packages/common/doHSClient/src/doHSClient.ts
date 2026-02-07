import {Logger} from "@aws-lambda-powertools/logger"
import axios, {AxiosRequestConfig} from "axios"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"

// Read the DoHS API Key from environment variables
const apigeeDoHSEndpoint = process.env["apigeeDoHSEndpoint"] as string
const apigeeDoHSApiKeyArn = process.env["APIGEE_DOHS_API_KEY_ARN"] as string

interface DoHSContact {
  ContactType: string
  ContactAvailabilityType: string
  ContactMethodType: string
  ContactValue: string
}

export interface DoHSOrg {
  OrganisationName: string
  ODSCode: string
  Address1: string
  City: string
  Postcode: string
  Contacts: Array<DoHSContact>
}

export const doHSClient = async (odsCodes: Array<string>, logger: Logger): Promise<Array<DoHSOrg>> => {
  const apigeeDoHSApiKey = await getSecret(apigeeDoHSApiKeyArn)
  logger.info("Fetching DoHS API data for ODS codes", {odsCodes})

  if (odsCodes.length === 0) {
    return []
  }

  // Throw errors if we dont have correct vars
  if (!apigeeDoHSApiKey) {
    throw new Error("Apigee API Key environment variable is not set")
  }
  if (!apigeeDoHSEndpoint) {
    throw new Error("DoHS API endpoint environment variable is not set")
  }

  // Construct filter query for multiple ODS codes
  const odsFilter = odsCodes.map((code) => `ODSCode eq '${code}'`).join(" or ")

  const config: AxiosRequestConfig = {
    params: {
      "api-version": "3",
      "$filter": odsFilter
    },
    headers: {"apikey": `${apigeeDoHSApiKey}`}
  }

  const response = await axios.get(apigeeDoHSEndpoint, config)
  logger.debug("Successfully fetched DoHS API response", {data: response.data})

  return response.data.value
}
