import axios, {AxiosError, InternalAxiosRequestConfig, isAxiosError} from "axios"
import {v4 as uuidv4} from "uuid"
import {fetchAuthSession} from "aws-amplify/auth"
import {logger} from "./logger"
import {cptAwsRum} from "./awsRum"

const x_request_id_header = "x-request-id"
const x_correlation_id_header = "x-correlation-id"
const x_retry_header = "x-retry-id"

const http = axios.create()

// REQUEST INTERCEPTOR
http.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const controller = new AbortController()

    config.headers[x_request_id_header] = uuidv4()
    config.headers[x_correlation_id_header] = uuidv4()
    const authSession = await fetchAuthSession()
    const idToken = authSession.tokens?.idToken
    if (idToken === undefined) {
      logger.error("Could not get a cognito token")
      controller.abort()
    }
    config.headers.Authorization = `Bearer ${idToken?.toString()}`

    // Make sure we have a retry counter in headers so we can track how many times we've retried
    if (!config.headers[x_retry_header]) {
      config.headers[x_retry_header] = "0"
    }

    return {
      ...config,
      signal: controller.signal
    }
  },
  (error) => {
    return Promise.reject(Error(error))
  }
)

// RESPONSE INTERCEPTOR
http.interceptors.response.use(
  (response) => {
    // If the response is successful, just return it
    return response
  },

  async (error: AxiosError | Error) => {
    const rumInstance = cptAwsRum.getAwsRum()
    let correlationHeaders
    if (isAxiosError(error)) {
      const {config, response} = error

      // If we have a response, attempt retries
      if (response && config) {
        correlationHeaders = {
          "x-request-id": config.headers[x_request_id_header],
          "x-correlation-id": config.headers[x_correlation_id_header]
        }
        // get retry count from the header
        let retryCount = parseInt(config.headers?.[x_retry_header] ?? "0")

        // If we've retried fewer than 3 times, retry the request
        if (retryCount < 3) {
          rumInstance?.recordEvent("axios_error", {message: "failed request - retrying", correlationHeaders})
          config.headers[x_retry_header] = `${++retryCount}`
          return http(config)
        }
        // we have reached here so log failed retry
        rumInstance?.recordEvent("axios_error", {message: "failed all retries in axios"})
      }
    }

    // Either its not an axios error or its failed 3 retries
    rumInstance?.recordEvent("axios_error", {message: error.message, stack: error.stack, correlationHeaders})
    // also use recordError to try and get source maps back to real line numbers
    rumInstance?.recordError(error)

    return Promise.reject(error)
  }
)

export default http
