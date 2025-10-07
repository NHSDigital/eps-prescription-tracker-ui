import {MiddlewareObj} from "@middy/core"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {Headers} from "@cpt-ui-common/common-types"

export const injectCorrelationLoggerMiddleware = (
  logger: Logger
) => ({
  before: async (request) => {
    const {event} = request
    const correlationId = event.headers["x-correlation-id"] || crypto.randomUUID()
    const loggerKeys = {
      "apigw-request-id": event.requestContext?.requestId,
      "x-request-id": event.headers[Headers.x_request_id],
      "x-correlation-id": correlationId,
      "x-session-id": event.headers[Headers.x_session_id],
      "x-rum-session-id": event.headers[Headers.x_rum_session_id]
    }
    logger.appendKeys({...loggerKeys})
    event.headers["x-correlation-id"] = correlationId
  }
} satisfies MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult, Error>)
