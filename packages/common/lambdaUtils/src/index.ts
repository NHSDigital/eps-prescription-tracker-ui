import {APIGatewayProxyEvent} from "aws-lambda"
import {v4 as uuidv4} from "uuid"
import {Logger} from "@aws-lambda-powertools/logger"

export * as headers from "./headers"
export * from "./exhaustiveGuard"

export type LoggerKeys = {
  "apigw-request-id"?: string,
  "x-request-id"?: string,
  "x-correlation-id"?: string
}
export type InboundEventValues = {
  loggerKeys: LoggerKeys,
  correlationId: string
}
export const extractInboundEventValues = (event: APIGatewayProxyEvent): InboundEventValues => {
  const correlationId = event.headers["x-correlation-id"] || uuidv4()
  return {
    loggerKeys: {
      "apigw-request-id": event.requestContext?.requestId,
      "x-request-id": event.headers["x-request-id"],
      "x-correlation-id": correlationId
    },
    correlationId
  }
}

export const appendLoggerKeys = (logger: Logger, keys: LoggerKeys): void => {
  logger.appendKeys({...keys})
}
