import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

// Logger initialization
const logger = new Logger({serviceName: "prescriptionDetails"})

// Error response template
const errorResponseBody = {message: "A system error has occurred"}

// Middleware error handler
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info("Lambda handler invoked", {event})

  // Extract prescriptionId from pathParameters
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

  // Log that we are about to fetch prescription details
  logger.info("Fetching details for prescription", {prescriptionId})

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Prescription details retrieved successfully`,
      prescriptionId: prescriptionId
    })
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
  .use(middyErrorHandler.errorHandler({logger}))
