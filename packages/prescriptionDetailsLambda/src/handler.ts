import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"

import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import httpHeaderNormalizer from "@middy/http-header-normalizer"

import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {v4 as uuidv4} from "uuid"

import {getUsernameFromEvent, authenticateRequest} from "@cpt-ui-common/authFunctions"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import {processPrescriptionRequest} from "./services/prescriptionService"

type HandlerParameters = {
  logger: Logger,
  documentClient: DynamoDBDocumentClient,
  apigeePrescriptionsEndpoint: string,
  tokenMappingTableName: string,
  jwtPrivateKeyArn: string,
  apigeeApiKey: string,
  apigeeApiSecret: string,
  jwtKid: string,
  apigeeMockTokenEndpoint: string,
  apigeeCis2TokenEndpoint: string
}

export type HandlerInitialisationParameters = {
  errorResponseBody: object,
  logger: Logger,
  documentClient: DynamoDBDocumentClient,
  apigeePrescriptionsEndpoint: string,
  tokenMappingTableName: string,
  jwtPrivateKeyArn: string,
  apigeeApiKey: string,
  apigeeApiSecret: string,
  jwtKid: string,
  apigeeMockTokenEndpoint: string,
  apigeeCis2TokenEndpoint: string
}

const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  {
    logger,
    documentClient,
    apigeePrescriptionsEndpoint,
    tokenMappingTableName,
    jwtPrivateKeyArn,
    apigeeApiKey,
    apigeeApiSecret,
    jwtKid,
    apigeeMockTokenEndpoint,
    apigeeCis2TokenEndpoint
  }: HandlerParameters
): Promise<APIGatewayProxyResult> => {
  // Attach request ID for tracing
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})

  // Handle x-request-id and x-correlation-id headers
  const headers = event.headers ?? []
  logger.appendKeys({"x-request-id": headers["x-request-id"]})

  const correlationId = headers["x-correlation-id"] || uuidv4()

  logger.info("Lambda handler invoked", {event})

  // Use the authenticateRequest function for authentication
  const username = getUsernameFromEvent(event)

  const {apigeeAccessToken, roleId, orgCode} = await authenticateRequest(username, documentClient, logger, {
    tokenMappingTableName,
    jwtPrivateKeyArn,
    apigeeApiKey,
    apigeeApiSecret,
    jwtKid,
    apigeeMockTokenEndpoint,
    apigeeCis2TokenEndpoint
  })

  // Log the token for debugging (redacted for security)
  logger.debug("Using Apigee access token and role", {
    apigeeAccessToken: apigeeAccessToken,
    roleId: roleId
  })

  // Fetch the private key for signing the client assertion
  const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
  if (!jwtPrivateKey || typeof jwtPrivateKey !== "string") {
    throw new Error("Invalid or missing JWT private key")
  }
  logger.info("JWT private key retrieved successfully")

  // ****************************************
  // PROCESS REQUEST
  // ****************************************

  // Pass the gathered data in to the processor for the request
  return await processPrescriptionRequest(
    event,
    apigeePrescriptionsEndpoint,
    apigeeAccessToken,
    roleId,
    orgCode,
    correlationId,
    logger
  )
}

export const newHandler = (
  initParams: HandlerInitialisationParameters
) => {
  const params: HandlerParameters = {
    logger: initParams.logger,
    documentClient: initParams.documentClient,
    apigeePrescriptionsEndpoint: initParams.apigeePrescriptionsEndpoint,
    tokenMappingTableName: initParams.tokenMappingTableName,
    jwtPrivateKeyArn: initParams.jwtPrivateKeyArn,
    apigeeApiKey: initParams.apigeeApiKey,
    apigeeApiSecret: initParams.apigeeApiSecret,
    jwtKid: initParams.jwtKid,
    apigeeMockTokenEndpoint: initParams.apigeeMockTokenEndpoint,
    apigeeCis2TokenEndpoint: initParams.apigeeCis2TokenEndpoint
  }

  return middy((event: APIGatewayProxyEvent) => lambdaHandler(event, params))
    .use(injectLambdaContext(initParams.logger, {clearState: true}))
    .use(httpHeaderNormalizer())
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
const apigeeCis2TokenEndpoint = process.env["apigeeCIS2TokenEndpoint"] as string
const apigeeMockTokenEndpoint = process.env["apigeeMockTokenEndpoint"] as string
// const apigeePrescriptionsEndpoint = process.env["apigeePrescriptionsEndpoint"] as string
const apigeePrescriptionsEndpoint = "https://internal-dev.api.service.nhs.uk/clinical-prescription-tracker-pr-809/"
const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const jwtKid = process.env["jwtKid"] as string
const apigeeApiKey = process.env["apigeeApiKey"] as string
const apigeeApiSecret= process.env["APIGEE_API_SECRET"] as string

// DynamoDB client setup
const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

// Error response template
const errorResponseBody = {message: "A system error has occurred"}

const DEFAULT_HANDLER_PARAMETERS: HandlerInitialisationParameters = {
  errorResponseBody,
  logger: new Logger({serviceName: "prescriptionDetails"}),
  documentClient,
  apigeePrescriptionsEndpoint,
  tokenMappingTableName: TokenMappingTableName,
  jwtPrivateKeyArn,
  apigeeApiKey,
  apigeeApiSecret,
  jwtKid,
  apigeeMockTokenEndpoint,
  apigeeCis2TokenEndpoint
}

export const handler = newHandler(DEFAULT_HANDLER_PARAMETERS)
