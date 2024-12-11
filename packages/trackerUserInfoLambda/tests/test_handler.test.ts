import {jest} from "@jest/globals"

import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"

// FIXME: These mocks are broken!
jest.mock("../src/cis2TokenHelpers", () => {

  const cis2AccessToken = "foo"
  const cis2IdToken = "bar"

  const username = "Mock_JoeBloggs"

  return {
    fetchAndVerifyCIS2Tokens: jest.fn(() => Promise.resolve({cis2AccessToken, cis2IdToken})),
    getUsernameFromEvent: jest.fn(() => username)
  }
})

jest.mock("../src/userInfoHelpers", () => {
  const userInfo = {
    roles_with_access: [],
    roles_without_access: [],
    currently_selected_role: []
  }

  return {
    fetchUserInfo: jest.fn(() => Promise.resolve(userInfo)),
    updateDynamoTable: jest.fn(() => true)
  }
})

beforeEach(() => {
  jest.restoreAllMocks()

  // Set default environment variables if needed
  process.env.MOCK_MODE_ENABLED = "false"
  process.env.REAL_IDP_TOKEN_PATH = "/real/idp/token"
  process.env.REAL_USER_INFO_ENDPOINT = "https://real-userinfo.com"
  process.env.REAL_OIDCJWKS_ENDPOINT = "https://real-jwks.com"
  process.env.REAL_JWT_PRIVATE_KEY_ARN = "arn:aws:ssm:region:account-id:parameter/real-key"
  process.env.REAL_USER_POOL_IDP = "RealPoolIdentityProvider"
  process.env.REAL_USE_SIGNED_JWT = "true"
  process.env.REAL_OIDC_CLIENT_ID = "real-client-id"
  process.env.REAL_OIDC_ISSUER = "https://real-oidc-issuer.com"
})

import {handler} from "../src/handler"

describe("Basic handler invocation", () => {
  let event = mockAPIGatewayProxyEvent
  let context = mockContext

  it("should return a response when called", async () => {

    const response = await handler(event, context)
    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode")
    expect(response).toHaveProperty("body")
  })
})
