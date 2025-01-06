import axios from "axios"
import {APIGatewayProxyResult} from "aws-lambda"

/**
 * Formats and returns an HTTP response for errors.
 * Handles both Axios errors and generic errors.
 * @param error - Error object or Axios error
 * @param defaultMessage - Default message to include in the response
 * @returns An APIGatewayProxyResult formatted error response
 */
export const handleErrorResponse = (error: unknown, defaultMessage: string): APIGatewayProxyResult => {
  if (axios.isAxiosError(error)) {
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({
        message: defaultMessage,
        details: error.response?.data || error.message
      })
    }
  }

  return {
    statusCode: 500,
    body: JSON.stringify({
      message: defaultMessage,
      details: error instanceof Error ? error.message : "Unknown error occurred"
    })
  }
}
