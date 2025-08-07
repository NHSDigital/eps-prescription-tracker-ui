import {APIGatewayProxyEventBase, APIGatewayProxyResult} from "aws-lambda"

import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import httpHeaderNormalizer from "@middy/http-header-normalizer"

import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {extractInboundEventValues, appendLoggerKeys} from "@cpt-ui-common/lambdaUtils"

import {
  AuthenticateRequestOptions,
  authenticationMiddleware,
  authParametersFromEnv,
  AuthResult
} from "@cpt-ui-common/authFunctions"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import {processPrescriptionRequest} from "./services/prescriptionService"
import axios, {AxiosInstance} from "axios"
import {formatHeaders} from "@cpt-ui-common/lambdaUtils/lib/src/headers"

type HandlerParameters = {
  logger: Logger,
  apigeePrescriptionsEndpoint: string
}

export type HandlerInitialisationParameters = {
  errorResponseBody: object,
  logger: Logger,
  documentClient: DynamoDBDocumentClient,
  apigeePrescriptionsEndpoint: string,
  authenticationParameters: AuthenticateRequestOptions,
  axiosInstance: AxiosInstance
}

const lambdaHandler = async (
  event: APIGatewayProxyEventBase<AuthResult>,
  {logger, apigeePrescriptionsEndpoint}: HandlerParameters
): Promise<APIGatewayProxyResult> => {
  const {loggerKeys, correlationId} = extractInboundEventValues(event)
  appendLoggerKeys(logger, loggerKeys)

  const {apigeeAccessToken, roleId, orgCode} = event.requestContext.authorizer

  if (!roleId) {
    throw new Error("roleId is undefined")
  }
  if (!orgCode) {
    throw new Error("orgCode is undefined")
  }

  const prescriptionId = event.pathParameters?.prescriptionId
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

  // Extract issueNumber from query parameters, default to "1" if not provided
  const issueNumber = event.queryStringParameters?.issueNumber || "1"

  // Pass the gathered data in to the processor for the request
  const response = await processPrescriptionRequest(
    prescriptionId,
    issueNumber,
    apigeePrescriptionsEndpoint,
    apigeeAccessToken,
    roleId,
    orgCode,
    correlationId,
    logger
  )

  return {
    statusCode: 200,
    body: JSON.stringify(response),
    headers: formatHeaders({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    })
  }
}

export const newHandler = (initParams: HandlerInitialisationParameters) => {
  const params: HandlerParameters = {
    logger: initParams.logger,
    apigeePrescriptionsEndpoint: initParams.apigeePrescriptionsEndpoint
  }

  return middy((event: APIGatewayProxyEventBase<AuthResult>) => lambdaHandler(event, params))
    .use(authenticationMiddleware(
      initParams.axiosInstance,
      initParams.documentClient,
      initParams.authenticationParameters,
      initParams.logger
    ))
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
const apigeePrescriptionsEndpoint = process.env["apigeePrescriptionsEndpoint"] as string
const authenticationParameters = authParametersFromEnv()

// DynamoDB client setup
const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

// Error response template
const errorResponseBody = {message: "A system error has occurred"}
const axiosInstance = axios.create()

const DEFAULT_HANDLER_PARAMETERS: HandlerInitialisationParameters = {
  errorResponseBody,
  logger: new Logger({serviceName: "prescriptionDetails"}),
  documentClient,
  apigeePrescriptionsEndpoint,
  authenticationParameters,
  axiosInstance
}

export const handler = newHandler(DEFAULT_HANDLER_PARAMETERS)
