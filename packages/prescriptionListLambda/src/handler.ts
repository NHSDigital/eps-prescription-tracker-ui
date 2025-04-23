import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import axios, {AxiosInstance} from "axios"
import {formatHeaders} from "./utils/headerUtils"
import {validateSearchParams} from "./utils/validation"
import {getPrescriptions, PrescriptionError} from "./services/prescriptionsLookupService"
import {SearchParams} from "./utils/types"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {
  getUsernameFromEvent,
  fetchAndVerifyCIS2Tokens,
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken,
  updateApigeeAccessToken,
  initializeOidcConfig
} from "@cpt-ui-common/authFunctions"
import {PatientDetails, SearchResponse} from "@cpt-ui-common/common-types"
import {createMinimalPatientDetails, mapSearchResponse} from "./utils/responseMapper"
import * as pds from "@cpt-ui-common/pdsClient"
import {exhaustive_switch_guard} from "./utils"

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
const logger = new Logger({serviceName: "prescriptionList"})

// External endpoints and environment variables
const apigeeCIS2TokenEndpoint = process.env["apigeeCIS2TokenEndpoint"] as string
const apigeeMockTokenEndpoint = process.env["apigeeMockTokenEndpoint"] as string
const apigeePrescriptionsEndpoint = process.env["apigeePrescriptionsEndpoint"] as string
const apigeePersonalDemographicsEndpoint = process.env["apigeePersonalDemographicsEndpoint"] as string
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
      searchResponse = await nhsNumberSearchFlow(
        axiosInstance,
        logger,
        apigeeAccessToken,
        searchParams.nhsNumber
      )
    } else {
      // Prescription ID search flow
      searchResponse = await prescriptionIdSearchFlow(
        axiosInstance,
        logger,
        apigeeAccessToken,
        searchParams.prescriptionId!
      )
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

const nhsNumberSearchFlow = async (
  axiosInstance: AxiosInstance,
  logger: Logger,
  apigeeAccessToken: string,
  nhsNumber: string
) => {
  const pdsClient = new pds.Client(
    axiosInstance,
    apigeePersonalDemographicsEndpoint,
    logger,
    apigeeAccessToken,
    roleId
  )
  const outcome = await pdsClient.getPatientDetails(nhsNumber)

  let currentNhsNumber = nhsNumber
  let patientDetails
  switch(outcome.type) {
    case pds.patientDetailsLookup.OutcomeType.SUCCESS:
      patientDetails = outcome.patientDetails
      break
    case pds.patientDetailsLookup.OutcomeType.SUPERSEDED:
      currentNhsNumber = outcome.supersededBy
      patientDetails = outcome.patientDetails

      logger.info("NHS Number has been superseded", {
        originalNhsNumber: nhsNumber,
        newNhsNumber: patientDetails.supersededBy
      })
      break
    case pds.patientDetailsLookup.OutcomeType.AXIOS_ERROR:
      patientDetails = createMinimalPatientDetails()
      logger.error("Error fetching patient details from PDS", {
        axios_error: outcome.error,
        nhsNumber: outcome.nhsNumber,
        timeMs: outcome.timeMs
      })
      break
    case pds.patientDetailsLookup.OutcomeType.R_FLAG:
    case pds.patientDetailsLookup.OutcomeType.S_FLAG:
    case pds.patientDetailsLookup.OutcomeType.PATIENT_NOT_FOUND:
    case pds.patientDetailsLookup.OutcomeType.PATIENT_DETAILS_VALIDATION_ERROR:
      throw handlePatientDetailsLookupError(outcome)
    default:
      throw exhaustive_switch_guard(outcome)
  }

  logger.debug("patientDetails", {
    body: patientDetails
  })

  const prescriptions = await getPrescriptions(
    axiosInstance,
    logger,
    apigeePrescriptionsEndpoint,
    {nhsNumber: currentNhsNumber},
    apigeeAccessToken,
    roleId
  )

  logger.debug("Prescriptions", {
    total: prescriptions.length,
    body: prescriptions
  })

  return mapSearchResponse(patientDetails, prescriptions)
}

const prescriptionIdSearchFlow = async(
  axiosInstance: AxiosInstance,
  logger: Logger,
  apigeeAccessToken: string,
  prescriptionId: string
) => {
  const prescriptions = await getPrescriptions(
    axiosInstance,
    logger,
    apigeePrescriptionsEndpoint,
    {prescriptionId: prescriptionId},
    apigeeAccessToken,
    roleId
  )

  // Get patient details using NHS Number from first prescription
  if (prescriptions.length === 0) {
    throw new PrescriptionError("Prescription not found")
  }

  logger.debug("Prescriptions", {
    total: prescriptions.length,
    body: prescriptions
  })

  const pdsClient = new pds.Client(
    axiosInstance,
    apigeePersonalDemographicsEndpoint,
    logger,
    apigeeAccessToken,
    roleId
  )
  const nhsNumber = prescriptions[0].nhsNumber!.toString()
  const outcome = await pdsClient.getPatientDetails(nhsNumber)

  let patientDetails
  switch(outcome.type) {
    case pds.patientDetailsLookup.OutcomeType.SUCCESS:
    case pds.patientDetailsLookup.OutcomeType.SUPERSEDED:
      patientDetails = outcome.patientDetails
      break
    case pds.patientDetailsLookup.OutcomeType.AXIOS_ERROR:
      patientDetails = createMinimalPatientDetails()
      logger.error("Error fetching patient details from PDS", {
        axios_error: outcome.error,
        nhsNumber: outcome.nhsNumber,
        timeMs: outcome.timeMs
      })
      break
    case pds.patientDetailsLookup.OutcomeType.R_FLAG:
    case pds.patientDetailsLookup.OutcomeType.S_FLAG:
    case pds.patientDetailsLookup.OutcomeType.PATIENT_NOT_FOUND:
    case pds.patientDetailsLookup.OutcomeType.PATIENT_DETAILS_VALIDATION_ERROR:
      throw handlePatientDetailsLookupError(outcome)
    default:
      throw exhaustive_switch_guard(outcome)
  }

  logger.debug("patientDetails", {
    body: patientDetails
  })

  return mapSearchResponse(patientDetails, prescriptions)
}

const handlePatientDetailsLookupError = (outcome: pds.patientDetailsLookup.Outcome) => {
  switch (outcome.type) {
    case pds.patientDetailsLookup.OutcomeType.PATIENT_NOT_FOUND:
      logger.error("PDS response data is empty", {nhsNumber: outcome.nhsNumber})
      throw new pds.PDSError("Patient not found", "NOT_FOUND")
    case pds.patientDetailsLookup.OutcomeType.S_FLAG:
      logger.info("Patient record marked with S Flag", {nhsNumber: outcome.nhsNumber})
      throw new pds.PDSError("Prescription not found", "S_FLAG")
    case pds.patientDetailsLookup.OutcomeType.R_FLAG:
      logger.info("Patient record marked as restricted", {nhsNumber: outcome.nhsNumber})
      throw new pds.PDSError("Prescription not found", "R_FLAG")
    case pds.patientDetailsLookup.OutcomeType.PATIENT_DETAILS_VALIDATION_ERROR:
      throw handleValidationError(outcome.error, outcome.patientDetails, outcome.nhsNumber)
    // Following cases will not be hit
    case pds.patientDetailsLookup.OutcomeType.SUCCESS:
    case pds.patientDetailsLookup.OutcomeType.SUPERSEDED:
    case pds.patientDetailsLookup.OutcomeType.AXIOS_ERROR:
      throw "Unreachable"
    default:
      throw exhaustive_switch_guard(outcome)
  }
}

const handleValidationError = (
  error: pds.patientDetailsLookup.ValidatePatientDetails.Outcome,
  patientDetails: PatientDetails,
  nhsNumber: string
) => {
  let validationError
  switch (error.type) {
    // Valid case will never be hit
    case pds.patientDetailsLookup.ValidatePatientDetails.OutcomeType.VALID:
      throw "Unreachable"
    case pds.patientDetailsLookup.ValidatePatientDetails.OutcomeType.MISSING_FIELDS:
      validationError = new pds.PDSError(
        `Incomplete patient information. Missing required fields: ${error.missingFields.join(", ")}`,
        "INCOMPLETE_DATA"
      )
      break
    case pds.patientDetailsLookup.ValidatePatientDetails.OutcomeType.NOT_NULL_WHEN_NOT_PRESENT:
      validationError = new pds.PDSError(`${error.field} must be explicitly null when not present`)
      break
    default:
      throw exhaustive_switch_guard(error)
  }

  logger.error("Patient data validation failed", {
    error: validationError,
    patientDetails: JSON.stringify(patientDetails),
    nhsNumber
  })
  throw new pds.PDSError("Incomplete patient data", "INCOMPLETE_DATA")
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
