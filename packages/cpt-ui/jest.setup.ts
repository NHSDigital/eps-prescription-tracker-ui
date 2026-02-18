/* eslint-disable no-undef */

import "@testing-library/jest-dom"

// Mock CSS/SCSS imports
jest.mock("*.css", () => ({}), {virtual: true})
jest.mock("*.scss", () => ({}), {virtual: true})
jest.mock("@/styles/searchforaprescription.scss", () => ({}), {virtual: true})

// Mock FooterStrings to avoid import.meta issues
jest.mock("@/constants/ui-strings/FooterStrings", () => ({
  FOOTER_COPYRIGHT: "© NHS England",
  COMMIT_ID: "test-commit-id",
  VERSION_NUMBER: "test-version-number",
  FOOTER_LINKS: [
    {
      text: "Privacy notice",
      href: "/site/privacy-notice",
      external: false,
      testId: "eps_footer-link-privacy-notice"
    },
    {
      text: "Terms and conditions (opens in new tab)",
      // eslint-disable-next-line max-len
      href: "https://digital.nhs.uk/services/care-identity-service/registration-authority-users/registration-authority-help/privacy-notice",
      external: true,
      testId: "eps_footer-link-terms-and-conditions"
    },
    {
      text: "Cookie policy",
      href: "/site/cookies",
      external: false,
      testId: "eps_footer-link-cookie-policy"
    }
  ]
}))

const cwr_cookie_value_string = JSON.stringify({"sessionId":"my_rum_session_id"})
const cwr_cookie_value_encoded = Buffer.from(cwr_cookie_value_string, "utf-8").toString("base64")

Object.defineProperty(document, "cookie", {
  value: `cwr_s=${cwr_cookie_value_encoded}`
})

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
jest.mock("@/constants/environment", () => ({
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
    COMMIT_ID: "test-commit-id",
    VERSION_NUMBER: "test-version-number"
  },
  RUM_CONFIG: {
    TELEMETRIES: []
  },
  API_ENDPOINTS: {
    TRACKER_USER_INFO: "/api/tracker-user-info"
  },
  FRONTEND_PATHS: {
    PRESCRIPTION_LIST_CURRENT: "/prescription-list-current",
    PRESCRIPTION_LIST_FUTURE: "/prescription-list-future",
    PRESCRIPTION_LIST_PAST: "/prescription-list-past",
    LOGIN: "/login",
    LOGOUT: "/logout",
    SELECT_YOUR_ROLE: "/select-your-role",
    YOUR_SELECTED_ROLE: "/your-selected-role",
    CHANGE_YOUR_ROLE: "/change-your-role",
    SEARCH: "/search",
    SEARCH_BY_PRESCRIPTION_ID: "/search#prescription-id",
    SEARCH_BY_NHS_NUMBER: "/search#nhs-number",
    SEARCH_BY_BASIC_DETAILS: "/search#basic-details",
    TOO_MANY_SEARCH_RESULTS: "/too-many-search-results"
  },
  MOCK_AUTH_ALLOWED_ENVIRONMENTS: ["dev", "dev-pr", "int", "qa"]
}))

// Allows for tab selection
class MediaQueryList {
  matches = false
  media = ""
  onchange = null
  addListener = jest.fn()
  removeListener = jest.fn()
  addEventListener = jest.fn()
  removeEventListener = jest.fn()
  dispatchEvent = jest.fn()

  constructor() {
    this.matches = false
    this.media = ""
  }
}

window.matchMedia = jest.fn().mockImplementation(() => new MediaQueryList())
