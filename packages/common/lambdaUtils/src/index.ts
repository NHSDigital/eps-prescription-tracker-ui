import {APIGatewayProxyEvent} from "aws-lambda"
import {v4 as uuidv4} from "uuid"
import {Logger} from "@aws-lambda-powertools/logger"
import {Headers} from "@cpt-ui-common/common-types"

export * as headers from "./headers"
export * from "./exhaustiveGuard"

export type LoggerKeys = {
  "apigw-request-id"?: string,
  "x-request-id"?: string,
  "x-correlation-id"?: string
  "x-rum-session-id"?: string
  "x-session-id"?: string
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
      "x-request-id": event.headers[Headers.x_request_id],
      "x-correlation-id": correlationId,
      "x-session-id": event.headers[Headers.x_session_id],
      "x-rum-session-id": event.headers[Headers.x_rum_session_id]
    },
    correlationId
  }
}

export const appendLoggerKeys = (logger: Logger, keys: LoggerKeys): void => {
  logger.appendKeys({...keys})
}
