import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import errorHandler from "@nhs/fhir-middy-error-handler"
import {createSpineClient} from "@NHSDigital/eps-spine-client"

const logger = new Logger({serviceName: "status"})

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "nhsd-correlation-id": event.headers["nhsd-correlation-id"],
    "x-request-id": event.headers["x-request-id"],
    "nhsd-request-id": event.headers["nhsd-request-id"],
    "x-correlation-id": event.headers["x-correlation-id"],
    "apigw-request-id": event.requestContext.requestId
  })

  const commitId = process.env.COMMIT_ID
  const versionNumber = process.env.VERSION_NUMBER

  const spineClient = createSpineClient(logger)
  const spineStatus = await spineClient.getStatus()

  const statusBody = {...spineStatus, commitId: commitId, versionNumber: versionNumber}

  return {
    statusCode: 200,
    body: JSON.stringify(statusBody),
    headers: {
      "Content-Type": "application/health+json",
      "Cache-Control": "no-cache"
    }
  }
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(errorHandler({logger: logger}))
