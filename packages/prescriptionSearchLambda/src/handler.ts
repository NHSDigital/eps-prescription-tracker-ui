import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import axios from "axios"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {formatHeaders} from "./utils/headerUtils"
import {constructSignedJWTBody} from "./utils/tokenUtils"
import {fetchCIS2Tokens} from "./utils/cis2TokenUtils"
import {handleErrorResponse} from "./utils/errorUtils"
import {exchangeTokenForApigeeAccessToken, updateApigeeAccessToken} from "./utils/apigeeUtils"
import {v4 as uuidv4} from "uuid"

// Logger initialization
const logger = new Logger({serviceName: "prescriptionSearch"})

// External endpoints and environment variables
const apigeeTokenEndpoint = "https://internal-dev.api.service.nhs.uk/oauth2/token"
const apigeePrescriptionsEndpoint = "https://internal-dev.api.service.nhs.uk/clinical-prescription-tracker/"
const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const apigeeApiKey = process.env["apigeeApiKey"] as string
const jwtKid = process.env["jwtKid"] as string
const roleId = "555254242106"

// DynamoDB client setup
const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

// Error response template
const errorResponseBody = {
  message: "A system error has occurred"
}

// Middleware error handler
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Attach request ID for tracing
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  const axiosInstance = axios.create()
  let prescriptionId: string | undefined

  try {
    // Step 1: Fetch CIS2 tokens
    logger.info("Retrieving CIS2 tokens from DynamoDB based on the current request context")
    const {cis2AccessToken, cis2IdToken} = await fetchCIS2Tokens(event, documentClient, logger)
    logger.debug("Successfully fetched CIS2 tokens", {cis2AccessToken, cis2IdToken})

    // Step 2: Fetch the private key for signing the client assertion
    logger.info("Accessing JWT private key from Secrets Manager to create signed client assertion")
    const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
    if (!jwtPrivateKey || typeof jwtPrivateKey !== "string") {
      throw new Error("Invalid or missing JWT private key")
    }

    logger.debug("JWT private key retrieved successfully")

    // Construct the token exchange payload
    const tokenExchangeData = {
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      subject_token: cis2IdToken,
      client_id: "clinical-prescription-tracker-client"
    }

    // Construct a new body with the signed JWT client assertion
    logger.info("Generating signed JWT for Apigee token exchange payload")
    const requestBody = constructSignedJWTBody(
      logger,
      tokenExchangeData,
      apigeeTokenEndpoint,
      jwtPrivateKey,
      apigeeApiKey,
      jwtKid
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
    prescriptionId = event.queryStringParameters?.prescriptionId || "defaultId"

    logger.info("Fetching prescription data from Apigee", {prescriptionId})
    // need to pass in role id, organization id and job role to apigee
    // user id is retrieved in apigee from access token
    const apigeeResponse = await axiosInstance.get(apigeePrescriptionsEndpoint,
      {
        params: {
          prescriptionId: prescriptionId
        },
        headers: {
          Authorization: `Bearer ${apigeeAccessToken}`,
          "nhsd-session-urid": roleId,
          "nhsd-organization-uuid": "A83008",
          "nhsd-session-jobrole": "123456123456",
          "x-request-id": uuidv4()
        }
      }
    )

    logger.info("Successfully fetched prescription data from Apigee", {
      prescriptionId,
      data: apigeeResponse.data
    })
    return {
      statusCode: 200,
      body: JSON.stringify(apigeeResponse.data),
      headers: formatHeaders(apigeeResponse.headers)
    }
  } catch (error) {
    logger.error("Error fetching prescription data from Apigee", {
      prescriptionId,
      error: axios.isAxiosError(error) ? error.response?.data : error
    })
    return handleErrorResponse(error, "Failed to fetch prescription data from Apigee API")
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
