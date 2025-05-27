import {APIGatewayProxyEvent, APIGatewayProxyEventQueryStringParameters, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {AxiosInstance} from "axios"
import {headers as headerUtils} from "@cpt-ui-common/lambdaUtils"
import * as pds from "@cpt-ui-common/pdsClient"
import {exhaustive_switch_guard} from "./utils"

export const ERROR_RESPONSE_BODY = {
  message: "A system error has occurred"
}

const code = (statusCode: number) => {
  return {
    body: (body: object) => {
      return {
        statusCode,
        body: JSON.stringify(body),
        headers: headerUtils.formatHeaders({"Content-Type": "application/json"})
      }
    }
  }
}

export type AuthenticationParameters = {
    tokenMappingTableName: string,
    jwtPrivateKeyArn: string,
    apigeeApiKey: string,
    apigeeApiSecret: string,
    jwtKid: string,
    defaultRoleId: string,
    apigeeMockTokenEndpoint: string,
    apigeeCis2TokenEndpoint: string,
  }

export type HandlerParameters = {
  logger: Logger,
  pdsClient: pds.Client,
  usernameExtractor: (event: APIGatewayProxyEvent) => string,
  authenticationFunction: (username: string) => Promise<{apigeeAccessToken: string, roleId: string}>
}

export type HandlerInitialisationParameters = {
  logger: Logger,
  axiosInstance: AxiosInstance,
  pdsEndpoint: string,
  authenticationParameters: AuthenticationParameters,
}

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  {
    logger,
    pdsClient,
    usernameExtractor,
    authenticationFunction
  }: HandlerParameters
): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })
  const headers = event.headers ?? []
  logger.appendKeys({"x-request-id": headers["x-request-id"]})

  logger.info("Lambda handler invoked", {event})

  const searchStartTime = Date.now()

  // Use the authenticateRequest function for authentication
  let username: string
  try{
    username = usernameExtractor(event)
  } catch {
    logger.info("Unable to extract username from event", {event})
    return code(400).body({
      message: "Username not found in event"
    })
  }

  let apigeeAccessToken: string | undefined
  let roleId: string | undefined
  try{
    const authResult = await authenticationFunction(username)

    apigeeAccessToken = authResult.apigeeAccessToken
    roleId = authResult.roleId
  } catch (error) {
    logger.error("Authentication failed", {error})
    return code(401).body({
      message: "Authentication failed"
    })
  }

  if(!apigeeAccessToken){
    logger.error("No valid Apigee access token found")
    return code(500).body({
      message: "Authentication failed"
    })
  }

  // Validate query parameters
  let familyName: string
  let givenName: string | undefined
  let dateOfBirth: string
  let postcode: string

  const validationErrors: Array<string> = []
  const queryStringParameters = event.queryStringParameters ?? {}
  familyName = guardQueryParameter(validationErrors, queryStringParameters, "familyName")
  givenName = event.queryStringParameters?.givenName
  dateOfBirth = guardQueryParameter(validationErrors, queryStringParameters, "dateOfBirth")
  postcode = guardQueryParameter(validationErrors, queryStringParameters, "postcode")
  if (validationErrors.length > 0) {
    logger.error("Validation error", {
      validationErrors,
      timeMs: Date.now() - searchStartTime
    })

    return code(400).body({
      message: "Invalid query parameters",
      error: String(validationErrors)
    })
  }

  // Query PDS
  const patientSearchOutcome = await pdsClient
    .with_access_token(apigeeAccessToken)
    .with_role_id(roleId)
    .patientSearch(familyName, dateOfBirth, postcode, givenName)

  let patients: Array<pds.patientSearch.PatientSummary> = []

  const timeMs = Date.now() - searchStartTime

  const outcomeType = pds.patientSearch.OutcomeType
  switch (patientSearchOutcome.type) {
    case outcomeType.INVALID_PARAMETERS:
      logger.error("Invalid parameters", {
        timeMs,
        error: patientSearchOutcome.validationErrors
      })
      return code(400).body({
        errors: patientSearchOutcome.validationErrors
      })
    case outcomeType.SUCCESS:
      patients = patientSearchOutcome.patients
      logger.info("Search completed", {
        timeMs,
        resultCount: patients.length
      })
      logger.debug("patientSearchResults", {
        body: patients
      })
      return code(200).body(patients)
    case outcomeType.TOO_MANY_MATCHES:
      logger.error("Too many matches", {
        timeMs,
        searchParameters: patientSearchOutcome.searchParameters
      })
      return code(400).body({
        message: "Too many matches"
      })
    case outcomeType.AXIOS_ERROR:
      logger.error("Axios error", {
        timeMs,
        error: patientSearchOutcome.error
      })
      return code(500).body(ERROR_RESPONSE_BODY)
    case outcomeType.PDS_ERROR:
      logger.error("Unsupported PDS response", {
        timeMs,
        response: patientSearchOutcome.response
      })
      return code(500).body(ERROR_RESPONSE_BODY)
    case outcomeType.RESPONSE_PARSE_ERROR:
      logger.error("Response parse error", {
        timeMs,
        response: patientSearchOutcome.response,
        validationErrors: patientSearchOutcome.validationErrors
      })
      return code(500).body(ERROR_RESPONSE_BODY)
    default:
      exhaustive_switch_guard(patientSearchOutcome)
  }

  throw new Error("Unreachable")
}

const guardQueryParameter = (
  validationErrors: Array<string>,
  params: APIGatewayProxyEventQueryStringParameters,
  paramName: string
): string => {
  const param = params[paramName]

  if (!param) {
    validationErrors.push(`Missing query parameter: ${paramName}`)
    return undefined as unknown as string
  }
  return param as string
}
