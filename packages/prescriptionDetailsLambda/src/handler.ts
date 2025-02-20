import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import axios from "axios"
import {v4 as uuidv4} from "uuid"
import {formatHeaders} from "./utils/headerUtils"
import {mergePrescriptionDetails} from "./utils/responseMapper"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {
  getUsernameFromEvent,
  fetchAndVerifyCIS2Tokens,
  constructSignedJWTBody,
  exchangeTokenForApigeeAccessToken,
  updateApigeeAccessToken,
  initializeOidcConfig
} from "@cpt-ui-common/authFunctions"
import {doHSClient} from "@cpt-ui-common/doHSClient"
// import {LambdaClient, InvokeCommand} from "@aws-sdk/client-lambda"

// Logger initialization
const logger = new Logger({serviceName: "prescriptionDetails"})

// External endpoints and environment variables
const apigeeCIS2TokenEndpoint = process.env["apigeeCIS2TokenEndpoint"] as string
const apigeeMockTokenEndpoint = process.env["apigeeMockTokenEndpoint"] as string
// const apigeePrescriptionsEndpoint = process.env["apigeePrescriptionsEndpoint"] as string
// The Apigee API base endpoint for prescription tracking
const apigeePrescriptionsEndpoint = "https://internal-dev.api.service.nhs.uk/clinical-prescription-tracker-pr-809/"
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
const errorResponseBody = {message: "A system error has occurred"}

// Middleware error handler
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Attach request ID for tracing
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  // Extract prescriptionId from pathParameters
  const axiosInstance = axios.create()

  // Mock usernames start with "Mock_", and real requests use usernames starting with "Primary_"
  const username = getUsernameFromEvent(event)
  const isMockToken = username.startsWith("Mock_")

  // Determine whether this request should be treated as mock or real.
  if (isMockToken && MOCK_MODE_ENABLED !== "true") {
    throw new Error("Trying to use a mock user when mock mode is disabled")
  }
  const isMockRequest = MOCK_MODE_ENABLED === "true" && isMockToken

  const apigeeTokenEndpoint = isMockRequest
    ? apigeeMockTokenEndpoint
    : apigeeCIS2TokenEndpoint

  logger.info("Is this a mock request?", {isMockRequest})

  // Step 1: Fetch CIS2 tokens
  logger.info("Retrieving CIS2 tokens from DynamoDB based on the current request context")
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

  // Step 5: Fetch prescription data from Apigee API
  const prescriptionId: string = event.pathParameters?.prescriptionId ?? "unknown"

  if (!prescriptionId) {
    logger.warn("No prescription ID provided in request", {event})
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing prescription ID in request",
        prescriptionId: null
      })
    }
  }

  logger.info("Fetching prescription details from Apigee", {prescriptionId})

  // Construct the request URL with prescriptionId
  const requestUrl = `${apigeePrescriptionsEndpoint}RequestGroup/${prescriptionId}`

  // Headers for the request to Apigee
  // need to pass in role id, organization id and job role to apigee
  // user id is retrieved in apigee from access token
  const requestHeaders = {
    Authorization: `Bearer ${apigeeAccessToken}`,
    "nhsd-session-urid": roleId,
    "nhsd-organization-uuid": "A83008",
    "nhsd-identity-uuid": "123456123456",
    "nhsd-session-jobrole": "123456123456",
    "x-request-id": uuidv4()
  }

  logger.info("Making request to Apigee", {
    requestUrl: requestUrl,
    headers: requestHeaders
  })

  /*
  * The following code makes a request to Apigee's endpoint to fetch prescription details.
  */
  // Fetch the prescription data from Apigee
  const apigeeResponse = await axiosInstance.get(requestUrl, {
    headers: requestHeaders
  })

  logger.info("Successfully fetched prescription details from Apigee", {
    prescriptionId,
    data: apigeeResponse.data
  })

  // Step 6: Extract ODS Code (if available)
  let extractedODSCode: string | null = null
  if (apigeeResponse.data?.entry?.[0]?.resource?.author?.identifier?.value) {
    extractedODSCode = apigeeResponse.data.entry[0].resource.author.identifier.value
    logger.info("Extracted ODS Code", {extractedODSCode})
  } else {
    logger.warn("No ODS Code found in Apigee response. Skipping DoHS API request.")
  }

  // Step 7: Fetch DoHS API Data (Only if ODS Code exists)
  let doHSData = {}
  if (extractedODSCode) {
    try {
      doHSData = await doHSClient(extractedODSCode)
      logger.info("Successfully fetched DoHS API data", {doHSData})
    } catch (error) {
      logger.error("Failed to fetch DoHS API data", {error})
      doHSData = {error: "Failed to fetch DoHS API data"}
    }
  }

  // Step 8: Merge Responses
  logger.info("Merging prescription details fetched from Apigee with data from DoHS", {
    prescriptionDetails: apigeeResponse.data,
    doHSData
  })

  const mergedResponse = mergePrescriptionDetails(apigeeResponse.data, doHSData)

  return {
    statusCode: 200,
    body: JSON.stringify(mergedResponse),
    headers: formatHeaders(apigeeResponse.headers)
  }
}

// Export the Lambda function with middleware applied
export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(inputOutputLogger({logger: (request) => logger.info(request)}))
  .use(middyErrorHandler.errorHandler({logger}))
