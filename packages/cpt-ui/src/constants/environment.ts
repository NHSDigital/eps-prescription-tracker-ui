// Auth Configuration
export const AUTH_CONFIG = {
  USER_POOL_ID: import.meta.env.VITE_userPoolId,
  USER_POOL_CLIENT_ID: import.meta.env.VITE_userPoolClientId,
  HOSTED_LOGIN_DOMAIN: import.meta.env.VITE_hostedLoginDomain,
  REDIRECT_SIGN_IN: import.meta.env.VITE_redirectSignIn,
  REDIRECT_SIGN_OUT: import.meta.env.VITE_redirectSignOut,
  REDIRECT_SESSION_SIGN_OUT: import.meta.env.VITE_redirectSessionSignOut
} as const

// Environment Configuration
export const ENV_CONFIG = {
  TARGET_ENVIRONMENT: import.meta.env.VITE_TARGET_ENVIRONMENT || "prod",
  API_DOMAIN_OVERRIDE: import.meta.env.VITE_API_DOMAIN_OVERRIDE,
  BASE_PATH: import.meta.env.BASE_PATH || "site",
  LOCAL_DEV: import.meta.env.VITE_LOCAL_DEV === "true",
  BASE_URL: import.meta.env.BASE_URL,
  BASE_URL_PATH: `${import.meta.env.BASE_URL}/${import.meta.env.BASE_PATH || "site"}/`
} as const

// Application Configuration
export const APP_CONFIG = {
  SERVICE_NAME: import.meta.env.VITE_SERVICE_NAME,
  COMMIT_ID: import.meta.env.VITE_COMMIT_ID,
  VERSION_NUMBER: import.meta.env.VITE_VERSION_NUMBER,
  REACT_LOG_LEVEL: import.meta.env.VITE_REACT_LOG_LEVEL
} as const

// API Endpoints
export const API_ENDPOINTS = {
  TRACKER_USER_INFO: "/api/tracker-user-info",
  SELECTED_ROLE: "/api/selected-role",
  PRESCRIPTION_LIST: "/api/prescription-list",
  CIS2_SIGNOUT_ENDPOINT: "/api/cis2-signout",
  PRESCRIPTION_DETAILS: "/api/prescription-details",
  PATIENT_SEARCH: "/api/patient-search",
  SESSION_MANAGEMENT: "/api/session-management"
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
  TELEMETRIES: import.meta.env.VITE_RUM_TELEMETRIES?.split(",") || [],
  RELEASE_ID: import.meta.env.VITE_COMMIT_ID
} as const

// Web page paths
export const FRONTEND_PATHS = {
  PRESCRIPTION_LIST_CURRENT: "/prescription-list-current",
  PRESCRIPTION_LIST_FUTURE: "/prescription-list-future",
  PRESCRIPTION_LIST_PAST: "/prescription-list-past",
  COOKIES: "/cookies",
  LOGIN: "/login",
  LOGOUT: "/logout",
  SESSION_LOGGED_OUT: "/session-logged-out",
  SELECT_YOUR_ROLE: "/select-your-role",
  YOUR_SELECTED_ROLE: "/your-selected-role",
  CHANGE_YOUR_ROLE: "/change-your-role",
  SEARCH_BY_PRESCRIPTION_ID: "/search-by-prescription-id",
  SEARCH_BY_NHS_NUMBER: "/search-by-nhs-number",
  SEARCH_BY_BASIC_DETAILS: "/search-by-basic-details",
  PRESCRIPTION_DETAILS_PAGE: "/prescription-details",
  PATIENT_SEARCH_RESULTS: "/patient-search-results",
  TOO_MANY_SEARCH_RESULTS: "/too-many-search-results",
  PATIENT_NOT_FOUND: "/patient-not-found",
  NO_PATIENT_FOUND: "/no-patient-found",
  NO_PRESCRIPTIONS_FOUND: "/no-prescriptions-found",
  PRIVACY_NOTICE: "/privacy-notice",
  COOKIES_SELECTED: "/cookies-selected",
  SESSION_SELECTION: "/select-active-session",
  NOT_FOUND: "/notfound"
}

// Public paths that don't require authentication
export const PUBLIC_PATHS = [
  FRONTEND_PATHS.LOGIN,
  FRONTEND_PATHS.LOGOUT,
  FRONTEND_PATHS.SESSION_LOGGED_OUT,
  FRONTEND_PATHS.COOKIES,
  FRONTEND_PATHS.PRIVACY_NOTICE,
  FRONTEND_PATHS.COOKIES_SELECTED,
  FRONTEND_PATHS.NOT_FOUND,
  "/"
] as const

export const ALLOWED_NO_ROLE_PATHS = [
  ...PUBLIC_PATHS,
  FRONTEND_PATHS.SELECT_YOUR_ROLE,
  FRONTEND_PATHS.SESSION_SELECTION
] as const

export const ALLOWED_NO_REDIRECT_PATHS = [
  ...PUBLIC_PATHS,
  FRONTEND_PATHS.SESSION_LOGGED_OUT
] as const

// Type for environment
export type MockAuthEnvironment = "dev" | "dev-pr" | "ref" | "qa"

export type Environment = MockAuthEnvironment | "prod" | "test" | "int"

export const AUTO_LOGIN_ENVIRONMENTS = [
  {environment: "dev", loginMethod: "mock"},
  {environment: "dev-pr", loginMethod: "mock"},
  {environment: "int", loginMethod: "cis2"},
  {environment: "prod", loginMethod: "cis2"}
]

// Validation helper
const validateEnvironment = (env: string): env is Environment => {
  return ["dev", "dev-pr", "int", "qa", "prod", "ref", "test"].includes(env)
}

// Ensure environment is valid
if (!validateEnvironment(ENV_CONFIG.TARGET_ENVIRONMENT)) {
  throw new Error(`Invalid environment: ${ENV_CONFIG.TARGET_ENVIRONMENT}`)
}
