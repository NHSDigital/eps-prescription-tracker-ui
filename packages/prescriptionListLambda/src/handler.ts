import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import axios from "axios"
import {formatHeaders} from "./utils/headerUtils"
import {validateSearchParams} from "./utils/validation"
import {getPdsPatientDetails} from "./services/patientDetailsLookupService"
import {getPrescriptions} from "./services/prescriptionsLookupService"
import {SearchParams} from "./utils/types"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {initializeAuthConfig, authenticateRequest} from "@cpt-ui-common/authFunctions"
import {SearchResponse} from "@cpt-ui-common/common-types"
import {mapSearchResponse} from "./utils/responseMapper"

/*
This is the lambda code to search for a prescription
It expects the following environment variables to be set

apigeeCIS2TokenEndpoint
apigeeMockTokenEndpoint
apigeePrescriptionsEndpoint
apigeePersonalDemographicsEndpoint
TokenMappingTableName
jwtPrivateKeyArn
apigeeApiKey
jwtKid
MOCK_MODE_ENABLED

CIS2_OIDC_ISSUER
CIS2_OIDC_CLIENT_ID
CIS2_OIDCJWKS_ENDPOINT
CIS2_USER_INFO_ENDPOINT
CIS2_USER_POOL_IDP

For mock calls, the following must be set
MOCK_OIDC_ISSUER
MOCK_OIDC_CLIENT_ID
MOCK_OIDCJWKS_ENDPOINT
MOCK_USER_INFO_ENDPOINT
MOCK_USER_POOL_IDP
*/

// Logger initialization
const logger = new Logger({serviceName: "prescriptionList"})

// External endpoints and environment variables
const apigeePrescriptionsEndpoint = process.env["apigeePrescriptionsEndpoint"] as string
const apigeePersonalDemographicsEndpoint = process.env["apigeePersonalDemographicsEndpoint"] as string

// DynamoDB client setup
const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

// Create a config for cis2 and mock
// this is outside functions so it can be re-used and caching works
const authConfig = initializeAuthConfig()

logger.info("env vars", {
  apigeePrescriptionsEndpoint,
  apigeePersonalDemographicsEndpoint,
  authConfig
})

// Error response template
const errorResponseBody = {
  message: "A system error has occurred"
}

// Middleware error handler
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })

  logger.info("Lambda handler invoked", {event})

  const searchStartTime = Date.now()
  const axiosInstance = axios.create()

  try {
    // Extract and validate search parameters
    const searchParams: SearchParams = {
      prescriptionId: event.queryStringParameters?.prescriptionId,
      nhsNumber: event.queryStringParameters?.nhsNumber
    }

    validateSearchParams(searchParams)

    // Use the authenticateRequest function for authentication
    const {apigeeAccessToken, roleId} = await authenticateRequest(event, documentClient, logger, authConfig)

    // Log the token for debugging
    logger.debug("Using Apigee access token and role", {
      apigeeAccessToken: apigeeAccessToken,
      roleId: roleId
    })

    // Search logic
    let searchResponse: SearchResponse

    if (searchParams.nhsNumber) {
      // NHS Number search flow
      const patientDetails = await getPdsPatientDetails(
        axiosInstance,
        logger,
        apigeePersonalDemographicsEndpoint,
        searchParams.nhsNumber,
        apigeeAccessToken,
        roleId
      )

      logger.debug("patientDetails", {
        body: patientDetails
      })

      // Check if NHS Number has been superseded
      let nhsNumber = searchParams.nhsNumber
      if (patientDetails.supersededBy) {
        logger.info("Using superseded NHS Number for prescription search", {
          originalNhsNumber: searchParams.nhsNumber,
          newNhsNumber: patientDetails.supersededBy
        })
        // Use the superseded NHS Number for prescription search
        nhsNumber = patientDetails.supersededBy
      }

      const prescriptions = await getPrescriptions(
        axiosInstance,
        logger,
        apigeePrescriptionsEndpoint,
        {nhsNumber},
        apigeeAccessToken,
        roleId
      )

      logger.debug("Prescriptions", {
        total: prescriptions.length,
        body: prescriptions
      })

      searchResponse = mapSearchResponse(patientDetails, prescriptions)
    } else {
      // Prescription ID search flow
      const prescriptions = await getPrescriptions(
        axiosInstance,
        logger,
        apigeePrescriptionsEndpoint,
        {prescriptionId: searchParams.prescriptionId!},
        apigeeAccessToken,
        roleId
      )

      if (prescriptions.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({message: "Prescription not found"}),
          headers: formatHeaders({"Content-Type": "application/json"})
        }
      }

      logger.debug("Prescriptions", {
        total: prescriptions.length,
        body: prescriptions
      })

      // Get patient details using NHS Number from first prescription
      const patientDetails = await getPdsPatientDetails(
        axiosInstance,
        logger,
        apigeePersonalDemographicsEndpoint,
        prescriptions[0].nhsNumber!.toString(),
        apigeeAccessToken,
        roleId
      )

      logger.debug("patientDetails", {
        body: patientDetails
      })

      searchResponse = mapSearchResponse(patientDetails, prescriptions)
    }

    logger.info("Search completed", {
      timeMs: Date.now() - searchStartTime,
      resultCount: (
        searchResponse.currentPrescriptions.length +
        searchResponse.futurePrescriptions.length +
        searchResponse.pastPrescriptions.length
      )
    })

    return {
      statusCode: 200,
      body: JSON.stringify(searchResponse),
      headers: formatHeaders({"Content-Type": "application/json"})
    }
  } catch (error) {
    logger.error("Search failed", {
      error,
      timeMs: Date.now() - searchStartTime
    })

    throw error
  }
}

// Export the Lambda function with middleware applied
export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(middyErrorHandler.errorHandler({logger: logger}))
