// Auth Configuration
export const AUTH_CONFIG = {
  USER_POOL_ID: import.meta.env.VITE_userPoolId,
  USER_POOL_CLIENT_ID: import.meta.env.VITE_userPoolClientId,
  HOSTED_LOGIN_DOMAIN: import.meta.env.VITE_hostedLoginDomain,
  REDIRECT_SIGN_IN: import.meta.env.VITE_redirectSignIn,
  REDIRECT_SIGN_OUT: import.meta.env.VITE_redirectSignOut
} as const

// Environment Configuration
export const ENV_CONFIG = {
  TARGET_ENVIRONMENT: import.meta.env.VITE_TARGET_ENVIRONMENT || "prod",
  API_DOMAIN_OVERRIDE: import.meta.env.VITE_API_DOMAIN_OVERRIDE,
  BASE_PATH: import.meta.env.BASE_PATH || "site",
  LOCAL_DEV: import.meta.env.VITE_LOCAL_DEV === "true"
} as const

// Application Configuration
export const APP_CONFIG = {
  SERVICE_NAME: import.meta.env.VITE_SERVICE_NAME,
  COMMIT_ID: import.meta.env.VITE_COMMIT_ID
} as const

// API Endpoints
export const API_ENDPOINTS = {
  TRACKER_USER_INFO: "/api/tracker-user-info",
  SELECTED_ROLE: "/api/selected-role",
  PRESCRIPTION_LIST: "/api/prescription-list",
  CIS2_SIGNOUT_ENDPOINT: "/api/cis2-signout",
  PRESCRIPTION_DETAILS: "/api/prescription-details"
} as const

// RUM CONFIG
export const RUM_CONFIG = {
  GUEST_ROLE_ARN: import.meta.env.VITE_RUM_GUEST_ROLE_ARN,
  IDENTITY_POOL_ID: import.meta.env.VITE_RUM_IDENTITY_POOL_ID,
  ENDPOINT: "https://dataplane.rum.eu-west-2.amazonaws.com",
  APPLICATION_ID: import.meta.env.VITE_RUM_APPLICATION_ID,
  REGION: "eu-west-2",
  VERSION: "1.0.0",
  ALLOW_COOKIES: import.meta.env.VITE_RUM_ALLOW_COOKIES === "true",
  ENABLE_XRAY: import.meta.env.VITE_RUM_ENABLE_XRAY === "true",
  SESSION_SAMPLE_RATE: Number(import.meta.env.VITE_RUM_SESSION_SAMPLE_RATE),
  TELEMETRIES: import.meta.env.VITE_RUM_TELEMETRIES.split(","),
  RELEASE_ID: import.meta.env.VITE_COMMIT_ID
} as const
// Web page paths
export const FRONTEND_PATHS = {
  PRESCRIPTION_NOT_FOUND: "/prescription-not-found",
  PRESCRIPTION_LIST: "/prescription-list",
  LOGIN: "/login",
  LOGOUT: "/logout",
  SELECT_YOUR_ROLE: "/select-your-role",
  YOUR_SELECTED_ROLE: "/your-selected-role",
  CHANGE_YOUR_ROLE: "/change-your-role",
  SEARCH_BY_PRESCRIPTION_ID: "/search-by-prescription-id",
  SEARCH_BY_NHS_NUMBER: "/search-by-nhs-number",
  SEARCH_BY_BASIC_DETAILS: "/search-by-basic-details",
  PRESCRIPTION_DETAILS_PAGE: "/prescription-details"
}

// This needs to be provided in backend requests as a header
export const NHS_REQUEST_URID = "555254242106"

// Type for environment
export type MockAuthEnvironment = "dev" | "dev-pr" | "int" | "qa";

export type Environment = MockAuthEnvironment | "prod" | "test";

// Mock Auth Configuration
export const MOCK_AUTH_ALLOWED_ENVIRONMENTS: ReadonlyArray<MockAuthEnvironment> =
  ["dev", "dev-pr", "int", "qa"] as const

// Validation helper
const validateEnvironment = (env: string): env is Environment => {
  return ["dev", "dev-pr", "int", "qa", "prod", "test"].includes(env)
}

// Ensure environment is valid
if (!validateEnvironment(ENV_CONFIG.TARGET_ENVIRONMENT)) {
  throw new Error(`Invalid environment: ${ENV_CONFIG.TARGET_ENVIRONMENT}`)
}
