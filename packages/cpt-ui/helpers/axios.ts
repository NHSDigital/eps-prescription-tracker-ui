import axios from "axios"
import {v4 as uuidv4} from "uuid"
import {InternalAxiosRequestConfig} from "axios"

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
    __retryCount?: number;
  }

const http = axios.create()

// REQUEST INTERCEPTOR
http.interceptors.request.use(
  (config: ExtendedAxiosRequestConfig) => {
    config.headers["X-request-id"] = uuidv4()

    // Make sure we have a retry counter in config so we can track how many times we've retried
    if (!config.__retryCount) {
      config.__retryCount = 0
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
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
    return Promise.reject(error)
  }
)

export default http
