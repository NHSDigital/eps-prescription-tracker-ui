import axios, {AxiosError, InternalAxiosRequestConfig, isAxiosError} from "axios"
import {fetchAuthSession} from "aws-amplify/auth"
import {logger} from "./logger"
import {cptAwsRum} from "./awsRum"
import {Headers} from "@cpt-ui-common/common-types"
import {readItemGroupFromLocalStorage} from "./useLocalStorageState"

const x_retry_header = "x-retry-id"

const http = axios.create()

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const last = parts.pop() // string | undefined
    if (!last) return null
    return last.split(";").shift() ?? null
  }
  return null
}

function getRumSessionIdFromCookie() {
  const raw = getCookie("cwr_s")
  if (!raw) return null

  try {
    const decoded = atob(raw) // base64 decode
    const parsed = JSON.parse(decoded) // parse JSON
    return parsed.sessionId || null // get property
  } catch (error) {
    logger.error("Could not get rum session id from cookie", error)
    // cant get the session id so just return nothing
    return null
  }
}
// REQUEST INTERCEPTOR
http.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const controller = new AbortController()

    config.headers[Headers.x_request_id] = crypto.randomUUID()
    config.headers[Headers.x_correlation_id] = crypto.randomUUID()
    config.headers[Headers.x_rum_session_id] = getRumSessionIdFromCookie()
    try {
      const sessionGroup = readItemGroupFromLocalStorage("sessionId")
      // if we have a session id from auth context then add it to the header
      if (sessionGroup["sessionId"]) {
        config.headers[Headers.x_session_id] = sessionGroup["sessionId"]
      }
    } catch (error) {
      logger.error("Could not get session id from storage", error)
    }

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
    let correlationHeaders: Record<string, string | undefined> = {}
    if (isAxiosError(error)) {
      const {config, response} = error

      // If we have a response, attempt retries
      if (response && config) {
        correlationHeaders[Headers.x_request_id] = config.headers[Headers.x_request_id]
        correlationHeaders[Headers.x_correlation_id] = config.headers[Headers.x_correlation_id]
        correlationHeaders[Headers.x_session_id] = config.headers[Headers.x_session_id]
        correlationHeaders[Headers.x_rum_session_id] = config.headers[Headers.x_rum_session_id]

        if (response.status === 401 && response.data?.restartLogin) {
          return Promise.reject(error)
        }

        // Let the component handle 404 error
        if (response.status === 404) {
          return Promise.reject(error)
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
