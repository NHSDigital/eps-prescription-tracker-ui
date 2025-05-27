import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import axios, {AxiosInstance} from "axios"
import inputOutputLogger from "@middy/input-output-logger"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {headers as headerUtils} from "@cpt-ui-common/lambdaUtils"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {authenticateRequest, getUsernameFromEvent} from "@cpt-ui-common/authFunctions"
import * as pds from "@cpt-ui-common/pdsClient"
import {exhaustive_switch_guard} from "./utils"

/*
This is the lambda code to search for a patient
It expects the following environment variables to be set

  TokenMappingTableName
  jwtPrivateKeyArn
  APIGEE_API_KEY
  APIGEE_API_SECRET
  jwtKid
  apigeeMockTokenEndpoint
  apigeeCIS2TokenEndpoint
  apigeePersonalDemographicsEndpoint
*/

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

type AuthenticationParameters = {
    tokenMappingTableName: string,
    jwtPrivateKeyArn: string,
    apigeeApiKey: string,
    apigeeApiSecret: string,
    jwtKid: string,
    apigeeMockTokenEndpoint: string,
    apigeeCis2TokenEndpoint: string,
  }

type HandlerParameters = {
  logger: Logger,
  pdsClient: pds.Client,
  authenticationFunction: (username: string, roleId: string) => Promise<{apigeeAccessToken: string, roleId: string}>
}

export type HandlerInitialisationParameters = {
  logger: Logger,
  axiosInstance: AxiosInstance,
  pdsEndpoint: string,
  authenticationParameters: AuthenticationParameters,
}

const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  {
    logger,
    pdsClient,
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
    username = getUsernameFromEvent(event)
  } catch {
    logger.info("Unable to extract username from event", {event})
    return code(400).body({
      message: "Username not found in event"
    })
  }

  let apigeeAccessToken: string | undefined
  let roleId: string | undefined
  try{
    const authResult = await authenticationFunction(username, roleId ?? "")

    apigeeAccessToken = authResult.apigeeAccessToken
    roleId = authResult.roleId
  } catch (error) {
    logger.error("Authentication failed", {
      error
    })
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
  try{
    familyName = validateQueryParameter(event.queryStringParameters?.familyName, "familyName")
    givenName = event.queryStringParameters?.givenName
    dateOfBirth = validateQueryParameter(event.queryStringParameters?.dateOfBirth, "dateOfBirth")
    postcode = validateQueryParameter(event.queryStringParameters?.postcode, "postcode")
  } catch (error) {
    logger.error("Validation error", {
      error,
      timeMs: Date.now() - searchStartTime
    })

    return code(400).body({
      message: "Invalid query parameters",
      error: String(error)
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

const validateQueryParameter = (query: string | undefined, paramName: string): string => {
  if (!query) {
    throw new Error(`Missing query parameter: ${paramName}`)
  }

  return query
}

export const newHandler = (
  {
    logger,
    axiosInstance,
    pdsEndpoint,
    authenticationParameters
  }: HandlerInitialisationParameters
) => {
  const pdsClient = new pds.Client(
    axiosInstance,
    pdsEndpoint,
    logger
  )

  const dynamoClient = new DynamoDBClient()
  const documentClient = DynamoDBDocumentClient.from(dynamoClient)

  const authenticationFunction = async (username: string, roleId: string) => {
    return authenticateRequest(username, documentClient, logger, {
      ...authenticationParameters,
      defaultRoleId: roleId
    })
  }

  const params: HandlerParameters = {
    logger,
    pdsClient,
    authenticationFunction
  }

  return middy((event: APIGatewayProxyEvent) => lambdaHandler(event, params))
    .use(injectLambdaContext(logger, {clearState: true}))
    .use(
      inputOutputLogger({
        logger: (request) => {
          logger.info(request)
        }
      })
    )
    .use(
      new MiddyErrorHandler(ERROR_RESPONSE_BODY)
        .errorHandler({logger: logger})
    )
}

// External endpoints and environment variables
const authParametersFromEnv = (): AuthenticationParameters => {
  return {
    tokenMappingTableName: process.env["TokenMappingTableName"] as string,
    jwtPrivateKeyArn: process.env["jwtPrivateKeyArn"] as string,
    apigeeApiKey: process.env["APIGEE_API_KEY"] as string,
    apigeeApiSecret: process.env["APIGEE_API_SECRET"] as string,
    jwtKid: process.env["jwtKid"] as string,
    apigeeMockTokenEndpoint: process.env["apigeeMockTokenEndpoint"] as string,
    apigeeCis2TokenEndpoint: process.env["apigeeCIS2TokenEndpoint"] as string
  }
}

const ERROR_RESPONSE_BODY = {
  message: "A system error has occurred"
}

const DEFAULT_HANDLER_PARAMETERS: HandlerInitialisationParameters = {
  logger: new Logger({serviceName: "patientSearchLambda"}),
  axiosInstance: axios.create(),
  pdsEndpoint: process.env["apigeePersonalDemographicsEndpoint"] as string,
  authenticationParameters: authParametersFromEnv()
}
export const handler = newHandler(DEFAULT_HANDLER_PARAMETERS)
