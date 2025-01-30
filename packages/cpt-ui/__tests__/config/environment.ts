export const AUTH_CONFIG = {
  USER_POOL_ID: "test-pool-id",
  USER_POOL_CLIENT_ID: "test-client-id",
  HOSTED_LOGIN_DOMAIN: "test.domain",
  REDIRECT_SIGN_IN: "http://localhost:3000",
  REDIRECT_SIGN_OUT: "http://localhost:3000/logout"
}

export const ENV_CONFIG = {
  TARGET_ENVIRONMENT: "test",
  API_DOMAIN_OVERRIDE: "http://localhost:8080",
  BASE_PATH: "",
  LOCAL_DEV: true
}

export const APP_CONFIG = {
  SERVICE_NAME: "Clinical prescription tracking service",
  COMMIT_ID: "test-commit-id"
}

export const API_ENDPOINTS = {
  TRACKER_USER_INFO: "/api/tracker-user-info"
}

export const MOCK_AUTH_ALLOWED_ENVIRONMENTS = ["dev", "dev-pr", "int", "qa", "test"]

export type Environment = "dev" | "dev-pr" | "int" | "qa" | "prod" | "test";
