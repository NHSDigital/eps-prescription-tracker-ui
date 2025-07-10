import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"

const handler = async (
  event: APIGatewayProxyEvent):
Promise<APIGatewayProxyResult> => {
  const logger = new Logger({serviceName: "postAuthentication"})

  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })
  logger.debug(`event ${event.body}`)

  return {
    statusCode: 200,
    isBase64Encoded: false,
    body: event.body as string
  }
}

export {handler}
