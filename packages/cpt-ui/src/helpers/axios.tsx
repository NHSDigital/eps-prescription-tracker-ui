import axios, {InternalAxiosRequestConfig} from "axios"
import {v4 as uuidv4} from "uuid"
import {fetchAuthSession} from "aws-amplify/auth"

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

const http = axios.create()

// REQUEST INTERCEPTOR
http.interceptors.request.use(
  async (config: ExtendedAxiosRequestConfig) => {
    const controller = new AbortController()

    config.headers["X-request-id"] = uuidv4()
    config.headers["X-Correlation-id"] = uuidv4()
    const authSession = await fetchAuthSession()
    console.log("authSession result", authSession)
    const idToken = authSession.tokens?.idToken
    if (idToken === undefined) {
      console.error("Could not get a token - aborting")
      controller.abort()
    }
    config.headers.Authorization = `Bearer ${idToken?.toString()}`

    // Make sure we have a retry counter in config so we can track how many times we've retried
    if (!config.__retryCount) {
      config.__retryCount = 0
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
  async (error) => {
    // Destructure for readability
    const {config, response} = error

    // If we have a response and it’s a 401, attempt retries
    if (response && response.status !== 200) {
      // Make sure __retryCount is set in the request config
      config.__retryCount = config.__retryCount || 0

      // If we've retried fewer than 3 times, retry the request
      if (config.__retryCount < 3) {
        config.__retryCount += 1
        return http(config)
      }
    }

    // If status isn't 401 or we've already retried 3 times, reject
    return Promise.reject(Error(error))
  }
)

export default http
