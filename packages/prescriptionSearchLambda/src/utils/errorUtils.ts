import axios, {AxiosError} from "axios"
import {APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"

/**
 * Logs detailed Axios error information and includes context messages.
 * @param error - The AxiosError object to handle
 * @param contextMessage - Context about where the error occurred
 * @param logger - Logger instance for structured logging
 */
export const handleAxiosError = (error: AxiosError, contextMessage: string, logger: Logger) => {
  if (axios.isAxiosError(error)) {
    const config: Partial<AxiosError["config"]> = error.config || {}
    logger.error(contextMessage, {
      message: error.message,
      status: error.response?.status,
      responseData: error.response?.data,
      responseHeaders: error.response?.headers,
      requestConfig: {
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: config.data
      }
    })
  } else {
    logger.error("Unexpected error during Axios request", {error})
  }
}

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
