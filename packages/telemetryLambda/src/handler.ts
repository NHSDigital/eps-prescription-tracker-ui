import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {LogLevel} from "@aws-lambda-powertools/logger/types"
import middy from "@middy/core"
import httpHeaderNormalizer from "@middy/http-header-normalizer"
import inputOutputLogger from "@middy/input-output-logger"
import {APIGatewayEvent, APIGatewayProxyResult} from "aws-lambda"

// Config
export const LOG_LEVEL = process.env.LOG_LEVEL as LogLevel
export const logger = new Logger({serviceName: "prescriptionSearch", logLevel: LOG_LEVEL})

const commonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-cache"
}

export interface HandlerParams {
  logger: Logger
}

export type TelemetryLog = {
    log_level: "INFO" | "ERROR"
    message: string
    attributes: unknown
    timestamp?: number
    sessionId?: number
}

export type TelemetryMetric = {
    metric_name: string
    dimension: {type: string, value: number}
    timestamp?: number
    sessionId?: number
}

export const apiGatewayHandler = async (
  _: HandlerParams, event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "nhsd-correlation-id": event.headers?.["nhsd-correlation-id"],
    "nhsd-request-id": event.headers?.["nhsd-request-id"],
    "x-correlation-id": event.headers?.["x-correlation-id"],
    "apigw-request-id": event.requestContext.requestId
  })

  const responseHeaders = {
    ...commonHeaders,
    "x-correlation-id": event.headers?.["x-correlation-id"] ?? ""
  }

  const body: object = JSON.parse(event.body!)
  if ("message" in body) {
    const log: TelemetryLog = body as TelemetryLog
    switch(log.log_level) {
      case "INFO":
        logger.info(log.message)
        break
      case "ERROR":
        logger.error(log.message)
        break
      default:
        logger.warn(`Received log with unrecognized log level: ${log.log_level}`, log)
    }
  } else {
    const metric: TelemetryMetric = body as TelemetryMetric
    logger.info(`Received metric: ${metric.metric_name}`,
      {
        metric_name: metric.metric_name,
        dimension: metric.dimension
      }
    )
  }

  return {
    statusCode: 200,
    body: JSON.stringify({}),
    headers: responseHeaders
  }
}

export const newHandler = (params: HandlerParams) => {
  const newHandler = middy((event: APIGatewayEvent) => apiGatewayHandler(params, event))
    .use(injectLambdaContext(logger, {clearState: true}))
    .use(httpHeaderNormalizer())
    .use(inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    }))
  return newHandler
}

const DEFAULT_HANDLER_PARAMS: HandlerParams = {logger}
export const handler = newHandler(DEFAULT_HANDLER_PARAMS)
