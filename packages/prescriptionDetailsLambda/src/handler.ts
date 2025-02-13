import {APIGatewayProxyHandler} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"

// Logger initialization
const logger = new Logger({serviceName: "prescriptionDetails"})

export const handler: APIGatewayProxyHandler = async (event) => {
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
