import {
  expect,
  describe,
  it,
  jest
} from "@jest/globals"

import {DynamoDBDocumentClient, GetCommandOutput, PutCommandInput} from "@aws-sdk/lib-dynamodb"
import createJWKSMock from "mock-jwks"
import nock from "nock"
import {generateKeyPairSync} from "crypto"
import jwksClient from "jwks-rsa"
import {OidcConfig} from "@cpt-ui-common/authFunctions"

// redefining readonly property of the performance object
const dummyContext = {
  callbackWaitsForEmptyEventLoop: true,
  functionVersion: "$LATEST",
  functionName: "foo-bar-function",
  memoryLimitInMB: "128",
  logGroupName: "/aws/lambda/foo-bar-function-123456abcdef",
  logStreamName: "2021/03/09/[$LATEST]abcdef123456abcdef123456abcdef123456",
  invokedFunctionArn: "arn:aws:lambda:eu-west-1:123456789012:function:foo-bar-function",
  awsRequestId: "c6af9ac6-7b61-11e6-9a41-93e812345678",
  requestId: "foo",
  getRemainingTimeInMillis: () => 1234,
  done: () => console.log("Done!"),
  fail: () => console.log("Failed!"),
  succeed: () => console.log("Succeeded!")
}

//const CIS2_OIDC_ISSUER = process.env.CIS2_OIDC_ISSUER
//const CIS2_OIDC_CLIENT_ID = process.env.CIS2_OIDC_CLIENT_ID
//const CIS2_OIDC_HOST = process.env.CIS2_OIDC_HOST ?? ""
//const CIS2_OIDCJWKS_ENDPOINT = process.env.CIS2_OIDCJWKS_ENDPOINT
//const CIS2_USER_INFO_ENDPOINT = process.env.CIS2_USER_INFO_ENDPOINT
//const CIS2_USER_POOL_IDP = process.env.CIS2_USER_POOL_IDP
//const CIS2_IDP_TOKEN_PATH = process.env.CIS2_IDP_TOKEN_PATH ?? ""
//const MOCK_OIDCJWKS_ENDPOINT = process.env.MOCK_OIDCJWKS_ENDPOINT
//const MOCK_USER_INFO_ENDPOINT = process.env.MOCK_USER_INFO_ENDPOINT
const MOCK_USER_POOL_IDP = process.env.MOCK_USER_POOL_IDP
//const MOCK_IDP_TOKEN_PATH = process.env.MOCK_IDP_TOKEN_PATH

const mockInitializeOidcConfig = jest.fn()
const mockGetSecret = jest.fn()

const {
  privateKey
} = generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: "spki",
    format: "pem"
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem"
  }
})
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {

  const initializeOidcConfig = mockInitializeOidcConfig.mockImplementation( () => {
    // Create a JWKS client for cis2 and mock
  // this is outside functions so it can be re-used
    const cis2JwksUri = process.env["CIS2_OIDCJWKS_ENDPOINT"] as string
    const cis2JwksClient = jwksClient({
      jwksUri: cis2JwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 3600000 // 1 hour
    })

    const cis2OidcConfig: OidcConfig = {
      oidcIssuer: process.env["CIS2_OIDC_ISSUER"] ?? "",
      oidcClientID: process.env["CIS2_OIDC_CLIENT_ID"] ?? "",
      oidcJwksEndpoint: process.env["CIS2_OIDCJWKS_ENDPOINT"] ?? "",
      oidcUserInfoEndpoint: process.env["CIS2_USER_INFO_ENDPOINT"] ?? "",
      userPoolIdp: process.env["CIS2_USER_POOL_IDP"] ?? "",
      jwksClient: cis2JwksClient,
      tokenMappingTableName: process.env["TokenMappingTableName"] ?? ""
    }

    const mockJwksUri = process.env["MOCK_OIDCJWKS_ENDPOINT"] as string
    const mockJwksClient = jwksClient({
      jwksUri: mockJwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 3600000 // 1 hour
    })

    const mockOidcConfig: OidcConfig = {
      oidcIssuer: process.env["MOCK_OIDC_ISSUER"] ?? "",
      oidcClientID: process.env["MOCK_OIDC_CLIENT_ID"] ?? "",
      oidcJwksEndpoint: process.env["MOCK_OIDCJWKS_ENDPOINT"] ?? "",
      oidcUserInfoEndpoint: process.env["MOCK_USER_INFO_ENDPOINT"] ?? "",
      userPoolIdp: process.env["MOCK_USER_POOL_IDP"] ?? "",
      jwksClient: mockJwksClient,
      tokenMappingTableName: process.env["TokenMappingTableName"] ?? ""
    }

    return {cis2OidcConfig, mockOidcConfig}
  })

  return {
    initializeOidcConfig
  }
})

jest.unstable_mockModule("@aws-lambda-powertools/parameters/secrets", () => {
  const getSecret = mockGetSecret.mockImplementation(async () => {
    return privateKey
  })

  return {
    getSecret
  }
})

const {handler} = await import("../src/tokenMock")

describe("handler tests with mock", () => {
  const jwks = createJWKSMock("https://dummyauth.com/")

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    jwks.start()
  })

  afterEach(() => {
    jwks.stop()
  })

  it("inserts correct details into dynamo table", async () => {
    // Configure our spy to capture the PutCommand parameters
    const putParams = {Item: undefined} as unknown as PutCommandInput

    const dynamoSpy = jest.spyOn(DynamoDBDocumentClient.prototype, "send")
      .mockImplementation(async (cmd) => {
        // Check the constructor name to differentiate between command types
        const commandName = cmd.constructor.name

        if (commandName.includes("GetCommand")) {
          // Return session state for GetCommand
          return {
            Item: {
              LocalCode: "test-code",
              ApigeeCode: "apigee-code",
              SessionState: "test-session-state"
            }
          } as unknown as GetCommandOutput
        } else if (commandName.includes("PutCommand")) {
          // For PutCommand, capture the parameters and return success
          putParams.Item = (cmd.input as PutCommandInput).Item
          return {}
        }

        // Default empty response
        return {}
      })

    // Mock Apigee token exchange response
    nock("https://internal-dev.api.service.nhs.uk")
      .post("/oauth2-mock/token")
      .reply(200, {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token"
      })

    // Mock Apigee userinfo response
    nock("https://internal-dev.api.service.nhs.uk")
      .get("/oauth2-mock/userinfo")
      .reply(200, {
        sub: "foo",
        name: "Test User",
        given_name: "Test",
        family_name: "User",
        email: "test@example.com",
        selected_roleid: "R8004"
      })

    const response = await handler({
      body: "code=test-code",
      headers: {}
    }, dummyContext)

    // Check response structure
    expect(response.statusCode).toBe(200)
    expect(response.body).toBeDefined()

    // Check that the DynamoDB was called
    expect(dynamoSpy).toHaveBeenCalled()

    // Check the captured PutCommand parameters
    expect(putParams.Item).toBeDefined()
    expect(putParams.Item!.username).toBe(`${MOCK_USER_POOL_IDP}_foo`)
    expect(putParams.Item!.CIS2_accessToken).toBe("test-access-token")
    expect(putParams.Item!.CIS2_idToken).toBeTruthy()
  })
})
