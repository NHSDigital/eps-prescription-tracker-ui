import axios from 'axios';

// This interceptor removes cookies from the header of any request to an `/api/*` endpoint.
axios.interceptors.request.use(
  (config) => {
    if (config.url.startsWith('/api/')) {
      // In the browser, set withCredentials to false to prevent cookies from being sent
      config.withCredentials = false;

      // For Node.js environments, remove the 'Cookie' header if it exists
      if (typeof window === 'undefined') {
        if (config.headers) {
          delete config.headers.Cookie;
          delete config.headers.cookie;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
)
