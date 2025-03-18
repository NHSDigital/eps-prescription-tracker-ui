import axios, {AxiosError} from "axios"
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
