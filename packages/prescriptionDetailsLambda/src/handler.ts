import {APIGatewayProxyHandler} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"

// Logger initialization
const logger = new Logger({serviceName: "prescriptionDetails"})

export const handler: APIGatewayProxyHandler = async (event) => {
  logger.info("Lambda handler invoked", {event})

  // Retrieve prescriptionId from query parameters
  const prescriptionId = event.queryStringParameters?.prescriptionId || "No prescription ID provided"

  return {
    statusCode: 200,
    body: JSON.stringify({prescriptionId})
  }
}
