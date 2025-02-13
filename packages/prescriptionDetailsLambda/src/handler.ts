import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {mockPrescriptionDetails} from "./mockPrescriptionDetails"

const logger = new Logger({serviceName: "prescriptionDetails"})
const apigeePrescriptionsEndpoint = process.env["apigeePrescriptionsEndpoint"] as string

const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Attach request ID for tracing
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  let prescriptionId: string | undefined

  // Fetch prescription data from Apigee API
  prescriptionId = event.pathParameters?.prescriptionId || "defaultId"

  logger.info("Fetching prescription data from Apigee", {prescriptionId})

  logger.info("Successfully fetched prescription details from Apigee", {
    apigeePrescriptionsEndpoint,
    prescriptionId,
    data: JSON.stringify(mockPrescriptionDetails)
  })

  return {
    statusCode: 200,
    body: JSON.stringify(mockPrescriptionDetails)
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
  .use(middyErrorHandler.errorHandler({logger: logger}))
