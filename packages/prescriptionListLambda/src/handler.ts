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
import {PatientSummary, SearchResponse} from "@cpt-ui-common/common-types"
import {mapSearchResponse} from "./utils/responseMapper"
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
  const patientDetails = await getPatientDetails(nhsNumber, {
    apigeeAccessToken,
    roleId,
    orgCode,
    correlationId
  }, logger)

  const prescriptions = await getPrescriptions(
    axiosInstance,
    logger,
    apigeePrescriptionsEndpoint,
    {nhsNumber: patientDetails?.nhsNumber ?? nhsNumber},
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

  const nhsNumber = prescriptions[0].nhsNumber!.toString()
  const patientDetails = await getPatientDetails(nhsNumber, {
    apigeeAccessToken,
    roleId,
    orgCode,
    correlationId
  }, logger)

  return mapSearchResponse(patientDetails, prescriptions)
}

interface PdsClientConfig {
  apigeeAccessToken: string
  roleId: string
  orgCode: string
  correlationId: string
}

const getPatientDetails = async (
  nhsNumber: string, pdsClientConfig: PdsClientConfig, logger: Logger): Promise<PatientSummary | undefined> => {
  const pdsClient = new pds.Client(
    axiosInstance,
    apigeePersonalDemographicsEndpoint,
    logger
  )
  const outcome = await pdsClient
    .with_access_token(pdsClientConfig.apigeeAccessToken)
    .with_role_id(pdsClientConfig.roleId)
    .with_org_code(pdsClientConfig.orgCode)
    .with_correlation_id(pdsClientConfig.correlationId)
    .getPatientDetails(nhsNumber)

  let patientDetails = undefined
  switch (outcome.type) {
    case pds.patientDetails.OutcomeType.SUCCESS:
      patientDetails = outcome.patientDetails
      break
    case pds.patientDetails.OutcomeType.SUPERSEDED:
      patientDetails = outcome.patientDetails

      logger.info("Using superseded NHS Number for prescription search", {
        originalNhsNumber: nhsNumber,
        newNhsNumber: outcome.supersededBy
      })
      break
    case pds.patientDetails.OutcomeType.AXIOS_ERROR:
      logger.error("Error fetching patient details from PDS", {
        axios_error: outcome.error,
        nhsNumber: outcome.nhsNumber,
        timeMs: outcome.timeMs
      })
      break
    case pds.patientDetails.OutcomeType.PDS_ERROR:
      logger.error("Error fetching patient details from PDS", {
        statusCode: outcome.statusCode,
        errorResponse: outcome.response,
        nhsNumber: outcome
      })
      break
    case pds.patientDetails.OutcomeType.RESTRICTED:
    case pds.patientDetails.OutcomeType.PATIENT_NOT_FOUND:
    case pds.patientDetails.OutcomeType.PARSE_ERROR:
      throw handlePatientDetailsLookupError(outcome)
    default:
      throw exhaustive_switch_guard(outcome)
  }

  logger.debug("patientDetails", {
    body: patientDetails
  })

  return patientDetails
}

const handlePatientDetailsLookupError = (outcome: pds.patientDetails.Outcome) => {
  switch (outcome.type) {
    case pds.patientDetails.OutcomeType.PATIENT_NOT_FOUND:
      logger.error("PDS response data is empty", {nhsNumber: outcome.nhsNumber})
      throw new PDSError("Patient not found", "NOT_FOUND")
    case pds.patientDetails.OutcomeType.RESTRICTED:
      logger.info("Patient record marked as restricted", {nhsNumber: outcome.nhsNumber})
      throw new PDSError("Prescription not found", "RESTRICTED")
    case pds.patientDetails.OutcomeType.PARSE_ERROR:
      logger.error("PDS response did not contain a valid FHIR message", {errors: outcome.validationErrors})
      throw new PDSError("PDS response invalid", "PARSE_ERROR")
    // Following cases will not be hit
    case pds.patientDetails.OutcomeType.SUCCESS:
    case pds.patientDetails.OutcomeType.SUPERSEDED:
    case pds.patientDetails.OutcomeType.AXIOS_ERROR:
    case pds.patientDetails.OutcomeType.PDS_ERROR:
      throw new Error("Unreachable")
    default:
      throw exhaustive_switch_guard(outcome)
  }
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
