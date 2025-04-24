import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import axios, {AxiosInstance} from "axios"
import inputOutputLogger from "@middy/input-output-logger"
import {headers} from "@cpt-ui-common/lambdaUtils"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import * as pds from "@cpt-ui-common/pdsClient"
import {exhaustive_switch_guard} from "./utils"

/*
This is the lambda code to search for a patient
It expects the following environment variables to be set

apigeeCIS2TokenEndpoint
apigeeMockTokenEndpoint
apigeePersonalDemographicsEndpoint
TokenMappingTableName
jwtPrivateKeyArn
apigeeApiKey
jwtKid
roleId
mockMode

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

type HandlerParameters = {
  logger: Logger,
  pdsClient: pds.Client
}

export type HandlerInitialisationParameters = {
  errorResponseBody: object,
  logger: Logger,
  axiosInstance: AxiosInstance,
  apigeePersonalDemographicsEndpoint: string,
  apigeeApiKey: string,
  roleId: string,
}

const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  {
    logger,
    pdsClient
  }: HandlerParameters
): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })

  logger.info("Lambda handler invoked", {event})

  const searchStartTime = Date.now()

  // Auth
  // TODO

  // Validate query parameters
  let familyName: string
  let dateOfBirth: string
  let postcode: string
  try{
    familyName = validateQueryParameter(event.queryStringParameters?.familyName, "familyName")
    dateOfBirth = validateQueryParameter(event.queryStringParameters?.dateOfBirth, "dateOfBirth")
    postcode = validateQueryParameter(event.queryStringParameters?.postcode, "postcode")
  } catch (error) {
    logger.error("Validation error", {
      error,
      timeMs: Date.now() - searchStartTime
    })

    throw error
  }
  // Query PDS
  const patientSearchOutcome = await pdsClient.patientSearch(familyName, dateOfBirth, postcode)

  let patients: Array<pds.patientSearch.PatientSummary> = []

  const outcomeType = pds.patientSearch.OutcomeType
  switch (patientSearchOutcome.type) {
    case outcomeType.INVALID_PARAMETERS:
      logger.error("Invalid parameters", {
        timeMs: Date.now() - searchStartTime,
        error: patientSearchOutcome.validationErrors
      })
      return {
        statusCode: 400,
        body: JSON.stringify({
          errors: patientSearchOutcome.validationErrors
        }),
        headers: headers.formatHeaders({"Content-Type": "application/json"})
      }
    case outcomeType.SUCCESS:
      patients = patientSearchOutcome.patients
      logger.info("Search completed", {
        timeMs: Date.now() - searchStartTime,
        resultCount: patients.length
      })
      logger.debug("patientSearchResults", {
        body: patients
      })
      return {
        statusCode: 200,
        body: JSON.stringify(patients),
        headers: headers.formatHeaders({"Content-Type": "application/json"})
      }
    case outcomeType.TOO_MANY_MATCHES:
      logger.error("Too many matches", {
        timeMs: Date.now() - searchStartTime,
        searchParameters: patientSearchOutcome.searchParameters
      })
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Too many matches"
        }),
        headers: headers.formatHeaders({"Content-Type": "application/json"})
      }
    case outcomeType.AXIOS_ERROR:
      logger.error("Axios error", {
        timeMs: Date.now() - searchStartTime,
        error: patientSearchOutcome.error
      })
      return {
        statusCode: 500,
        body: JSON.stringify(errorResponseBody),
        headers: headers.formatHeaders({"Content-Type": "application/json"})
      }
    case outcomeType.PDS_ERROR:
      logger.error("Unsupported PDS response", {
        timeMs: Date.now() - searchStartTime,
        response: patientSearchOutcome.response
      })
      return {
        statusCode: 500,
        body: JSON.stringify(errorResponseBody),
        headers: headers.formatHeaders({"Content-Type": "application/json"})
      }
    case outcomeType.RESPONSE_PARSE_ERROR:
      logger.error("Response parse error", {
        timeMs: Date.now() - searchStartTime,
        response: patientSearchOutcome.response,
        validationErrors: patientSearchOutcome.validationErrors
      })
      return {
        statusCode: 500,
        body: JSON.stringify(errorResponseBody),
        headers: headers.formatHeaders({"Content-Type": "application/json"})
      }
    default:
      exhaustive_switch_guard(patientSearchOutcome)
  }

  throw new Error("Unreachable")
}

const validateQueryParameter = (query: string | undefined, paramName: string): string => {
  if (!query) {
    throw new Error(`Missing query parameter: ${paramName}`)
  }

  return query
}

export const newHandler = (
  initParams: HandlerInitialisationParameters
) => {
  const pdsClient = new pds.Client(
    initParams.axiosInstance,
    initParams.apigeePersonalDemographicsEndpoint,
    initParams.logger,
    initParams.apigeeApiKey,
    initParams.roleId
  )

  const params: HandlerParameters = {
    logger: initParams.logger,
    pdsClient
  }

  return middy((event: APIGatewayProxyEvent) => lambdaHandler(event, params))
    .use(injectLambdaContext(initParams.logger, {clearState: true}))
    .use(
      inputOutputLogger({
        logger: (request) => {
          initParams.logger.info(request)
        }
      })
    )
    .use(
      new MiddyErrorHandler(initParams.errorResponseBody)
        .errorHandler({logger: initParams.logger})
    )
}

// External endpoints and environment variables
const apigeePersonalDemographicsEndpoint = process.env["apigeePersonalDemographicsEndpoint"] as string
const apigeeApiKey = process.env["apigeeApiKey"] as string
const roleId = process.env["roleId"] as string

const errorResponseBody = {
  message: "A system error has occurred"
}

const DEFAULT_HANDLER_PARAMETERS: HandlerInitialisationParameters = {
  errorResponseBody,
  logger: new Logger({serviceName: "patientSearchLambda"}),
  axiosInstance: axios.create(),
  apigeePersonalDemographicsEndpoint,
  apigeeApiKey,
  roleId
}
export const handler = newHandler(DEFAULT_HANDLER_PARAMETERS)
