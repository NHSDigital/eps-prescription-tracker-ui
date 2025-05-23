import {jest} from "@jest/globals"

import {generateKeyPairSync} from "crypto"
import jwksClient from "jwks-rsa"

import {OidcConfig} from "@cpt-ui-common/authFunctions"

import {mockAPIGatewayProxyEvent, mockContext, mockMergedResponse} from "./mockObjects"

const {privateKey} = generateKeyPairSync("rsa", {
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

const mockFetchAndVerifyCIS2Tokens = jest.fn()
const mockGetUsernameFromEvent = jest.fn()
const mockConstructSignedJWTBody = jest.fn()
const mockExchangeTokenForApigeeAccessToken = jest.fn()
const mockUpdateApigeeAccessToken = jest.fn()
const mockInitializeOidcConfig = jest.fn()
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  const fetchAndVerifyCIS2Tokens = mockFetchAndVerifyCIS2Tokens.mockImplementation(async () => {
    return {
      cis2IdToken: "idToken",
      cis2AccessToken: "accessToken"
    }
  })

  const getUsernameFromEvent = mockGetUsernameFromEvent.mockImplementation(() => {
    return "Mock_JoeBloggs"
  })

  const constructSignedJWTBody = mockConstructSignedJWTBody.mockImplementation(() => {
    return {
      client_assertion: "foo"
    }
  })

  const exchangeTokenForApigeeAccessToken = mockExchangeTokenForApigeeAccessToken.mockImplementation(async () => {
    return {
      accessToken: "foo",
      expiresIn: 100
    }

  })

  const updateApigeeAccessToken = mockUpdateApigeeAccessToken.mockImplementation(() => {})

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
    fetchAndVerifyCIS2Tokens,
    getUsernameFromEvent,
    constructSignedJWTBody,
    exchangeTokenForApigeeAccessToken,
    updateApigeeAccessToken,
    initializeOidcConfig
  }
})

interface PrescriptionResponse {
  statusCode: number;
  body: string;
  headers: { foo: string };
}
const mockProcessPrescriptionRequest = jest.fn<() => Promise<PrescriptionResponse>>()
jest.unstable_mockModule("../src/utils/prescriptionService", () => {
  const processPrescriptionRequest = mockProcessPrescriptionRequest.mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify(mockMergedResponse),
    headers: {foo: "bar"}
  })

  return {
    processPrescriptionRequest
  }
})

const mockGetSecret = jest.fn()
jest.unstable_mockModule("@aws-lambda-powertools/parameters/secrets", () => {
  const getSecret = mockGetSecret.mockImplementation(async () => {
    return privateKey
  })

  return {
    getSecret
  }
})

// Mock the DynamoDB client.
const mockSend = jest.fn()

jest.unstable_mockModule("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => {
    return {}
  })
}))

// Mock the DynamoDB Document Client.
jest.unstable_mockModule("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockImplementation(() => {
      return {
        send: mockSend
      }
    })
  }
}))

// Import the handler after the mocks have been defined.
const {handler} = await import("../src/handler")

describe("Lambda Handler Tests", () => {
  // Create copies of the event and context for testing.
  let event = {...mockAPIGatewayProxyEvent}
  let context = {...mockContext}

  beforeEach(() => {
    // Reset mocks before each test.
    jest.restoreAllMocks()
    jest.clearAllMocks()
    process.env.MOCK_MODE_ENABLED = "true"
  })

  it("Handler returns 200 if all the components return successes", async () => {
    const response = await handler(event, context)

    expect(response).toBeDefined()
    expect(response.statusCode).toBe(200)

    const parsedBody = JSON.parse(response.body)
    expect(parsedBody).toStrictEqual(mockMergedResponse)
  })

  it("Throws error when using a mock user but MOCK_MODE_ENABLED is not 'true'", async () => {
    // Disable mock mode
    process.env.MOCK_MODE_ENABLED = "false"

    // getUsernameFromEvent already returns a username starting with "Mock_"
    const response = await handler(event, context)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })

  it("Throws error when JWT private key is missing or invalid", async () => {
    // Simulate getSecret returning a null or invalid value.
    mockGetSecret.mockImplementationOnce(async () => null)
    const response = await handler(event, context)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })

  it("Returns system error response if processPrescriptionRequest throws an error", async () => {
    // Simulate an error in the prescription service.
    mockProcessPrescriptionRequest.mockRejectedValueOnce(new Error("Test error"))
    const response = await handler(event, context)

    expect(response).toStrictEqual({message: "A system error has occurred"})
  })
})
