import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import axios from "axios"
import {formatHeaders} from "./utils/headerUtils"
import {validateSearchParams} from "./utils/validation"
import {getPdsPatientDetails} from "./services/patientDetailsLookupService"
import {getPrescriptions, PrescriptionError} from "./services/prescriptionsLookupService"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {
  getUsernameFromEvent,
  fetchAndVerifyCIS2Tokens,
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken,
  updateApigeeAccessToken,
  initializeOidcConfig
} from "@cpt-ui-common/authFunctions"
import {SearchResponse, SearchParams} from "./types"
import {mapSearchResponse} from "./utils/responseMapper"

/*
This is the lambda code to search for a prescription
It expects the following environment variables to be set

apigeeCIS2TokenEndpoint
apigeeMockTokenEndpoint
apigeePrescriptionsEndpoint
TokenMappingTableName
jwtPrivateKeyArn
apigeeApiKey
jwtKid
roleId
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
const logger = new Logger({serviceName: "prescriptionSearch"})

// External endpoints and environment variables
const apigeeCIS2TokenEndpoint = process.env["apigeeCIS2TokenEndpoint"] as string
const apigeeMockTokenEndpoint = process.env["apigeeMockTokenEndpoint"] as string
const apigeePrescriptionsEndpoint = process.env["apigeePrescriptionsEndpoint"] as string
const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const apigeeApiKey = process.env["apigeeApiKey"] as string
const jwtKid = process.env["jwtKid"] as string
const roleId = process.env["roleId"] as string
const MOCK_MODE_ENABLED = process.env["MOCK_MODE_ENABLED"]

// DynamoDB client setup
const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

// Create a config for cis2 and mock
// this is outside functions so it can be re-used and caching works
const {mockOidcConfig, cis2OidcConfig} = initializeOidcConfig()

// Error response template
const errorResponseBody = {
  message: "A system error has occurred"
}

// Middleware error handler
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
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

    // Handle mock/real request logic
    const username = getUsernameFromEvent(event)
    const isMockToken = username.startsWith("Mock_")

    if (isMockToken && MOCK_MODE_ENABLED !== "true") {
      throw new Error("Trying to use a mock user when mock mode is disabled")
    }

    const isMockRequest = MOCK_MODE_ENABLED === "true" && isMockToken
    const apigeeTokenEndpoint = isMockRequest ? apigeeMockTokenEndpoint : apigeeCIS2TokenEndpoint

    // Authentication flow
    const {cis2AccessToken, cis2IdToken} = await fetchAndVerifyCIS2Tokens(
      event,
      documentClient,
      logger,
      isMockRequest ? mockOidcConfig : cis2OidcConfig
    )
    logger.debug("Successfully fetched CIS2 tokens", {cis2AccessToken, cis2IdToken})

    // Step 2: Fetch the private key for signing the client assertion
    logger.info("Accessing JWT private key from Secrets Manager to create signed client assertion")
    const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
    if (!jwtPrivateKey || typeof jwtPrivateKey !== "string") {
      throw new Error("Invalid or missing JWT private key")
    }

    logger.debug("JWT private key retrieved successfully")

    // Construct a new body with the signed JWT client assertion
    logger.info("Generating signed JWT for Apigee token exchange payload")
    const requestBody = constructSignedJWTBody(
      logger,
      apigeeTokenEndpoint,
      jwtPrivateKey,
      apigeeApiKey,
      jwtKid,
      cis2IdToken
    )
    logger.debug("Constructed request body for Apigee token exchange", {requestBody})

    // Step 3: Exchange token with Apigee
    const {accessToken: apigeeAccessToken, expiresIn} = await exchangeTokenForApigeeAccessToken(
      axiosInstance,
      apigeeTokenEndpoint,
      requestBody,
      logger
    )

    // Step 4: Update DynamoDB with the new Apigee access token
    await updateApigeeAccessToken(
      documentClient,
      TokenMappingTableName,
      event.requestContext.authorizer?.claims?.["cognito:username"] || "unknown",
      apigeeAccessToken,
      expiresIn,
      logger
    )

    // Search logic
    let searchResponse: SearchResponse

    if (searchParams.nhsNumber) {
      // NHS Number search flow
      const patientDetails = await getPdsPatientDetails(
        axiosInstance,
        logger,
        apigeePrescriptionsEndpoint,
        searchParams.nhsNumber,
        apigeeAccessToken,
        roleId
      )

      // Check if NHS Number has been superseded
      if (patientDetails.supersededBy) {
        logger.info("Using superseded NHS Number for prescription search", {
          originalNhsNumber: searchParams.nhsNumber,
          newNhsNumber: patientDetails.supersededBy
        })
        // Use the superseded NHS Number for prescription search
        const prescriptions = await getPrescriptions(
          axiosInstance,
          logger,
          apigeePrescriptionsEndpoint,
          {nhsNumber: patientDetails.supersededBy},
          apigeeAccessToken,
          roleId
        )

        searchResponse = mapSearchResponse(patientDetails, prescriptions)
      } else {
        // Normal flow - use original NHS Number
        const prescriptions = await getPrescriptions(
          axiosInstance,
          logger,
          apigeePrescriptionsEndpoint,
          {nhsNumber: searchParams.nhsNumber},
          apigeeAccessToken,
          roleId
        )

        searchResponse = mapSearchResponse(patientDetails, prescriptions)
      }
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

      // Get patient details using NHS Number from first prescription
      if (prescriptions.length === 0) {
        throw new PrescriptionError("Prescription not found")
      }

      const patientDetails = await getPdsPatientDetails(
        axiosInstance,
        logger,
        apigeePrescriptionsEndpoint,
        prescriptions[0].nhsNumber!.toString(),
        apigeeAccessToken,
        roleId
      )

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

    if (error instanceof PrescriptionError && error.message === "Prescription not found") {
      return {
        statusCode: 404,
        body: JSON.stringify({message: "Prescription not found"}),
        headers: formatHeaders({"Content-Type": "application/json"})
      }
    }

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
