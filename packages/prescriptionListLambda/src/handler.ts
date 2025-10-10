import {APIGatewayProxyEventBase, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import axios, {AxiosInstance} from "axios"
import {validateSearchParams} from "./utils/validation"
import {getPrescriptions} from "./services/prescriptionsLookupService"
import {SearchParams} from "./utils/types"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {PatientDetails, SearchResponse} from "@cpt-ui-common/common-types"
import {createMinimalPatientDetails, mapSearchResponse} from "./utils/responseMapper"
import * as pds from "@cpt-ui-common/pdsClient"
import httpHeaderNormalizer from "@middy/http-header-normalizer"
import {authenticationMiddleware, authParametersFromEnv, AuthResult} from "@cpt-ui-common/authFunctions"
import {PrescriptionError, PDSError} from "./utils/errors"
import {URL} from "url"

import {headers, exhaustive_switch_guard, injectCorrelationLoggerMiddleware} from "@cpt-ui-common/lambdaUtils"
const formatHeaders = headers.formatHeaders

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
const apigeePrescriptionsEndpoint = process.env["apigeePrescriptionsEndpoint"] as string
const apigeePersonalDemographicsEndpoint = new URL(process.env["apigeePersonalDemographicsEndpoint"] as string)

// DynamoDB client setup
const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const axiosInstance = axios.create()
const authenticationParameters = authParametersFromEnv()

// Error response template
const errorResponseBody = {
  message: "A system error has occurred"
}

const RESPONSE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
}

// Middleware error handler
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEventBase<AuthResult>): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers["x-correlation-id"] || crypto.randomUUID()
  const {apigeeAccessToken, roleId, orgCode} = event.requestContext.authorizer

  const searchStartTime = Date.now()

  try {
    // Extract and validate search parameters
    const searchParams: SearchParams = {
      prescriptionId: event.queryStringParameters?.prescriptionId,
      nhsNumber: event.queryStringParameters?.nhsNumber
    }

    validateSearchParams(searchParams)

    // Log the token for debugging (redacted for security)
    logger.debug("Using Apigee access token and role", {
      apigeeAccessToken: apigeeAccessToken,
      roleId: roleId
    })

    // Search logic
    let searchResponse: SearchResponse
    if (roleId === undefined) {
      throw new Error("roleId is undefined")
    }
    if (orgCode === undefined) {
      throw new Error("orgCode is undefined")
    }
    if (searchParams.nhsNumber) {
      // NHS Number search flow
      searchResponse = await nhsNumberSearchFlow(
        axiosInstance,
        logger,
        apigeeAccessToken,
        roleId,
        orgCode,
        correlationId,
        searchParams.nhsNumber
      )
    } else {
      // Prescription ID search flow
      searchResponse = await prescriptionIdSearchFlow(
        axiosInstance,
        logger,
        apigeeAccessToken,
        roleId,
        orgCode,
        correlationId,
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
      headers: formatHeaders(RESPONSE_HEADERS)
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
        headers: formatHeaders(RESPONSE_HEADERS)
      }
    }

    throw error
  }
}

const nhsNumberSearchFlow = async (
  axiosInstance: AxiosInstance,
  logger: Logger,
  apigeeAccessToken: string,
  roleId: string,
  orgCode: string,
  correlationId: string,
  nhsNumber: string
): Promise<SearchResponse> => {
  const pdsClient = new pds.Client(
    axiosInstance,
    apigeePersonalDemographicsEndpoint,
    logger
  )
  const outcome = await pdsClient
    .with_access_token(apigeeAccessToken)
    .with_role_id(roleId)
    .with_org_code(orgCode)
    .with_correlation_id(correlationId)
    .getPatientDetails(nhsNumber)

  let currentNhsNumber = nhsNumber
  let patientDetails
  switch (outcome.type) {
    case pds.patientDetailsLookup.OutcomeType.SUCCESS:
      patientDetails = outcome.patientDetails
      break
    case pds.patientDetailsLookup.OutcomeType.SUPERSEDED:
      currentNhsNumber = outcome.supersededBy
      patientDetails = outcome.patientDetails

      logger.info("Using superseded NHS Number for prescription search", {
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
    roleId,
    orgCode,
    correlationId
  )

  logger.debug("Prescriptions", {
    total: prescriptions.length,
    body: prescriptions
  })

  return mapSearchResponse(patientDetails, prescriptions)
}

const prescriptionIdSearchFlow = async (
  axiosInstance: AxiosInstance,
  logger: Logger,
  apigeeAccessToken: string,
  roleId: string,
  orgCode: string,
  correlationId: string,
  prescriptionId: string
): Promise<SearchResponse> => {
  const prescriptions = await getPrescriptions(
    axiosInstance,
    logger,
    apigeePrescriptionsEndpoint,
    {prescriptionId: prescriptionId},
    apigeeAccessToken,
    roleId,
    orgCode,
    correlationId
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
    logger
  )
  const nhsNumber = prescriptions[0].nhsNumber!.toString()
  const outcome = await pdsClient
    .with_access_token(apigeeAccessToken)
    .with_role_id(roleId)
    .with_org_code(orgCode)
    .with_correlation_id(correlationId)
    .getPatientDetails(nhsNumber)

  let patientDetails
  switch (outcome.type) {
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
      throw new PDSError("Patient not found", "NOT_FOUND")
    case pds.patientDetailsLookup.OutcomeType.S_FLAG:
      logger.info("Patient record marked with S Flag", {nhsNumber: outcome.nhsNumber})
      throw new PDSError("Prescription not found", "S_FLAG")
    case pds.patientDetailsLookup.OutcomeType.R_FLAG:
      logger.info("Patient record marked as restricted", {nhsNumber: outcome.nhsNumber})
      throw new PDSError("Prescription not found", "R_FLAG")
    case pds.patientDetailsLookup.OutcomeType.PATIENT_DETAILS_VALIDATION_ERROR:
      throw handleValidationError(outcome.error, outcome.patientDetails, outcome.nhsNumber)
    // Following cases will not be hit
    case pds.patientDetailsLookup.OutcomeType.SUCCESS:
    case pds.patientDetailsLookup.OutcomeType.SUPERSEDED:
    case pds.patientDetailsLookup.OutcomeType.AXIOS_ERROR:
      throw new Error("Unreachable")
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
      throw new Error("Unreachable")
    case pds.patientDetailsLookup.ValidatePatientDetails.OutcomeType.MISSING_FIELDS:
      validationError = new PDSError(
        `Incomplete patient information. Missing required fields: ${error.missingFields.join(", ")}`,
        "INCOMPLETE_DATA"
      )
      break
    case pds.patientDetailsLookup.ValidatePatientDetails.OutcomeType.NOT_NULL_WHEN_NOT_PRESENT:
      validationError = new PDSError(`${error.field} must be explicitly null when not present`)
      break
    default:
      throw exhaustive_switch_guard(error)
  }

  logger.error("Patient data validation failed", {
    error: validationError,
    patientDetails: JSON.stringify(patientDetails),
    nhsNumber
  })
  throw new PDSError("Incomplete patient data", "INCOMPLETE_DATA")
}

// Export the Lambda function with middleware applied
export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(httpHeaderNormalizer())
  .use(injectCorrelationLoggerMiddleware(logger))
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(authenticationMiddleware({
    axiosInstance,
    ddbClient: documentClient,
    authOptions: authenticationParameters,
    logger
  }))
  .use(middyErrorHandler.errorHandler({logger: logger}))
