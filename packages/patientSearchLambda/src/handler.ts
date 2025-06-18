import {APIGatewayProxyEvent, APIGatewayProxyEventQueryStringParameters, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {
  headers as headerUtils,
  exhaustive_switch_guard,
  extractInboundEventValues,
  appendLoggerKeys
} from "@cpt-ui-common/lambdaUtils"
import * as pds from "@cpt-ui-common/pdsClient"

export const INTERNAL_ERROR_RESPONSE_BODY = {
  message: "A system error has occurred"
}

// const code = (statusCode: number) => ({
//   body: (body: object) => ({
//     statusCode,
//     body: JSON.stringify(body),
//     headers: headerUtils.formatHeaders({"Content-Type": "application/json"})
//   })
// })
const code = (statusCode: number) => ({
  body: (body: object) => ({
    statusCode,
    body: JSON.stringify(body),
    headers: headerUtils.formatHeaders({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    })
  })
})

// Dependencies used by the lambda to process an event,
//  injected to be easier to mock out in unit tests
export type HandlerParameters = {
  logger: Logger,
  pdsClient: pds.Client,
  usernameExtractor: (event: APIGatewayProxyEvent) => string,
  authenticationFunction: (username: string) => Promise<{
    apigeeAccessToken: string,
    roleId: string | undefined,
    orgCode: string | undefined
  }>
}

// Lambda handler function
export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  {
    logger,
    pdsClient,
    usernameExtractor,
    authenticationFunction
  }: HandlerParameters
): Promise<APIGatewayProxyResult> => {
  const {loggerKeys, correlationId} = extractInboundEventValues(event)
  appendLoggerKeys(logger, loggerKeys)

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
  let orgCode: string | undefined
  try{
    const authResult = await authenticationFunction(username)

    apigeeAccessToken = authResult.apigeeAccessToken
    roleId = authResult.roleId
    orgCode = authResult.orgCode
    if (roleId === undefined) {
      throw new Error("roleId is undefined")
    }
    if (orgCode === undefined) {
      throw new Error("orgCode is undefined")
    }
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

  // Guard query parameters
  let validationErrors: Array<string> = []
  let familyName
  let dateOfBirth

  const queryStringParameters = event.queryStringParameters ?? {};
  [familyName, validationErrors] = guardQueryParameter(queryStringParameters, "familyName", validationErrors)
  let givenName = queryStringParameters["givenName"];
  [dateOfBirth, validationErrors] = guardQueryParameter(queryStringParameters, "dateOfBirth", validationErrors)
  let postcode = queryStringParameters["postcode"]
  if (validationErrors.length > 0) {
    logger.error("Validation error", {
      validationErrors,
      timeMs: Date.now() - searchStartTime
    })

    return code(400).body({
      message: "Missing query parameters",
      error: validationErrors.join(", ")
    })
  }

  // Query PDS
  const patientSearchOutcome = await pdsClient
    .with_access_token(apigeeAccessToken)
    .with_role_id(roleId)
    .with_org_code(orgCode)
    .with_correlation_id(correlationId)
    .patientSearch(familyName as string, dateOfBirth as string, postcode, givenName)

  let patients: Array<pds.patientSearch.PatientSummary> = []

  const timeMs = Date.now() - searchStartTime

  const outcomeType = pds.patientSearch.OutcomeType
  switch (patientSearchOutcome.type) {
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
    case outcomeType.INVALID_PARAMETERS:
      logger.info("Invalid parameters", {
        timeMs,
        error: patientSearchOutcome.validationErrors
      })
      return code(400).body({
        errors: patientSearchOutcome.validationErrors
      })
    case outcomeType.TOO_MANY_MATCHES:
      logger.info("Too many matches", {
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
      return code(500).body(INTERNAL_ERROR_RESPONSE_BODY)
    case outcomeType.PDS_ERROR:
      logger.error("Unsupported PDS response", {
        timeMs,
        response: patientSearchOutcome.response
      })
      return code(500).body(INTERNAL_ERROR_RESPONSE_BODY)
    case outcomeType.PARSE_ERROR:
      logger.error("Response parse error", {
        timeMs,
        response: patientSearchOutcome.response,
        validationErrors: patientSearchOutcome.validationErrors
      })
      return code(500).body(INTERNAL_ERROR_RESPONSE_BODY)
    default:
      exhaustive_switch_guard(patientSearchOutcome)
  }

  throw new Error("Unreachable")
}

const guardQueryParameter = (
  params: APIGatewayProxyEventQueryStringParameters,
  paramName: string,
  validationErrors: Array<string>
): [string | undefined, Array<string>] => {
  const param = params[paramName]

  if (!param) {
    validationErrors.push(paramName)
  }

  return [param, validationErrors]
}
