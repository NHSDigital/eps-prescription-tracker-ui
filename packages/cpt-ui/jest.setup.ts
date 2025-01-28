/* eslint-disable no-undef */

import "@testing-library/jest-dom"

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn()
  }))
})

// Mock the environment module
jest.mock("@/config/environment", () => ({
  AUTH_CONFIG: {
    USER_POOL_ID: "test-pool-id",
    USER_POOL_CLIENT_ID: "test-client-id",
    HOSTED_LOGIN_DOMAIN: "test.domain",
    REDIRECT_SIGN_IN: "http://localhost:3000",
    REDIRECT_SIGN_OUT: "http://localhost:3000/logout"
  },
  ENV_CONFIG: {
    TARGET_ENVIRONMENT: "test",
    API_DOMAIN_OVERRIDE: "http://localhost:8080",
    BASE_PATH: "",
    LOCAL_DEV: true
  },
  APP_CONFIG: {
    SERVICE_NAME: "Clinical prescription tracking service",
    COMMIT_ID: "test-commit-id"
  },
  API_ENDPOINTS: {
    TRACKER_USER_INFO: "/api/tracker-user-info"
  },
  MOCK_AUTH_ALLOWED_ENVIRONMENTS: ["dev", "dev-pr", "int", "qa"]
}))
