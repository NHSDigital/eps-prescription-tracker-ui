import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import axios, {AxiosInstance} from "axios"
import inputOutputLogger from "@middy/input-output-logger"
import {headers} from "@cpt-ui-common/lambdaUtils"

import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {
  getUsernameFromEvent,
  fetchAndVerifyCIS2Tokens,
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken,
  updateApigeeAccessToken,
  initializeOidcConfig,
  OidcConfig
} from "@cpt-ui-common/authFunctions"
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
  authParameters: AuthParameters,
  documentClient: DynamoDBDocumentClient,
  axiosInstance: AxiosInstance,
  pdsClient: pds.Client
}

type AuthParameters = {
  mockOidcConfig: OidcConfig,
  cis2OidcConfig: OidcConfig,
  mockMode: string | undefined,
  apigeeMockTokenEndpoint: string,
  apigeeCIS2TokenEndpoint: string,
  jwtPrivateKeyArn: string,
  apigeeApiKey: string,
  jwtKid: string,
  TokenMappingTableName: string,
}

type HandlerInitialisationParameters = {
  logger: Logger,
  authParameters: AuthParameters,
  axiosInstance: AxiosInstance,
  apigeePersonalDemographicsEndpoint: string,
  roleId: string,
}

const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  {
    logger,
    documentClient,
    axiosInstance,
    authParameters: {
      mockOidcConfig,
      cis2OidcConfig,
      mockMode,
      apigeeMockTokenEndpoint,
      apigeeCIS2TokenEndpoint,
      jwtPrivateKeyArn,
      apigeeApiKey,
      jwtKid,
      TokenMappingTableName
    },
    pdsClient
  }: HandlerParameters
): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })

  logger.info("Lambda handler invoked", {event})

  const searchStartTime = Date.now()

  // Auth
  try {
    // Handle mock/real request logic
    const username = getUsernameFromEvent(event)
    const isMockToken = username.startsWith("Mock_")

    if (isMockToken && mockMode !== "true") {
      throw new Error("Trying to use a mock user when mock mode is disabled")
    }

    const isMockRequest = mockMode === "true" && isMockToken
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
      event.requestContext.authorizer?.claims?.["cognito:username"] ?? "unknown",
      apigeeAccessToken,
      expiresIn,
      logger
    )
  } catch (error) {
    logger.error("Search failed", {
      error,
      timeMs: Date.now() - searchStartTime
    })

    throw error
  }

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
        // TODO: Body
        body: "",
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

const newHandler = (
  initParams: HandlerInitialisationParameters,
  middyErrorHandler: MiddyErrorHandler
) => {
  const pdsClient = new pds.Client(
    initParams.axiosInstance,
    initParams.apigeePersonalDemographicsEndpoint,
    initParams.logger,
    initParams.authParameters.apigeeApiKey,
    initParams.roleId
  )

  const params: HandlerParameters = {
    logger: initParams.logger,
    documentClient: DynamoDBDocumentClient.from(new DynamoDBClient({})),
    axiosInstance: initParams.axiosInstance,
    authParameters: initParams.authParameters,
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
    .use(middyErrorHandler.errorHandler({logger: initParams.logger}))
}

// External endpoints and environment variables
const apigeeCIS2TokenEndpoint = process.env["apigeeCIS2TokenEndpoint"] as string
const apigeeMockTokenEndpoint = process.env["apigeeMockTokenEndpoint"] as string
const apigeePersonalDemographicsEndpoint = process.env["apigeePersonalDemographicsEndpoint"] as string
const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const apigeeApiKey = process.env["apigeeApiKey"] as string
const jwtKid = process.env["jwtKid"] as string
const roleId = process.env["roleId"] as string
const MOCK_MODE_ENABLED = process.env["MOCK_MODE_ENABLED"]

const {mockOidcConfig, cis2OidcConfig} = initializeOidcConfig()

const errorResponseBody = {
  message: "A system error has occurred"
}

// Export the Lambda function with middleware applied
const DEFAULT_AUTH_PARAMETERS: AuthParameters = {
  mockOidcConfig,
  cis2OidcConfig,
  mockMode: MOCK_MODE_ENABLED,
  apigeeMockTokenEndpoint,
  apigeeCIS2TokenEndpoint,
  jwtPrivateKeyArn,
  apigeeApiKey,
  jwtKid,
  TokenMappingTableName
}

const DEFAULT_HANDLER_PARAMETERS: HandlerInitialisationParameters = {
  logger: new Logger({serviceName: "patientSearchLambda"}),
  axiosInstance: axios.create(),
  authParameters: DEFAULT_AUTH_PARAMETERS,
  apigeePersonalDemographicsEndpoint,
  roleId
}
export const handler = newHandler(
  DEFAULT_HANDLER_PARAMETERS,
  new MiddyErrorHandler(errorResponseBody)
)
