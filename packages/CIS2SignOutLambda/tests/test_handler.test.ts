import {jest} from "@jest/globals"

import jwksClient from "jwks-rsa"
import {OidcConfig} from "@cpt-ui-common/authFunctions"

import {mockAPIGatewayProxyEvent, mockContext} from "./mockObjects"

// Mocked functions from cis2TokenHelpers
const mockFetchAndVerifyCIS2Tokens = jest.fn()
const mockGetUsernameFromEvent = jest.fn()
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

  const initializeOidcConfig = mockInitializeOidcConfig.mockImplementation(() => {
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
    initializeOidcConfig
  }
})

// This mock will be used for the documentClient.send() call
const sendMock = jest.fn()

// Mock the DynamoDB client constructor (if needed)
jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn()
}))

// Mock the lib-dynamodb module so that DeleteCommand and DynamoDBDocumentClient are replaced.
const deleteCommandMock = jest.fn()
jest.mock("@aws-sdk/lib-dynamodb", () => {
  return {
    DeleteCommand: deleteCommandMock,
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: sendMock
      }))
    }
  }
})

const {handler} = await import("@/handler")

describe("Lambda Handler", () => {
  beforeEach(async () => {
    jest.clearAllMocks()
  })

  it("should return 200 and success message on successful deletion", async () => {
    sendMock.mockImplementationOnce(() => Promise.resolve({$metadata: {httpStatusCode: 200}}))

    const response = await handler(mockAPIGatewayProxyEvent, mockContext)

    console.log(response)
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.message).toBe("CIS2 logout completed")

    // Verify that DeleteCommand was called with the expected parameters
    expect(deleteCommandMock).toHaveBeenCalledWith({
      TableName: process.env.TokenMappingTableName,
      Key: {username: mockAPIGatewayProxyEvent.requestContext.authorizer.claims["cognito:username"]}
    })

    expect(sendMock).toHaveBeenCalled()
  })

  it("should return error message if deletion is unsuccessful", async () => {
    sendMock.mockImplementationOnce(() => Promise.resolve({$metadata: {httpStatusCode: 500}}))

    const response = await handler(mockAPIGatewayProxyEvent, mockContext)
    console.log(response)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })
  })

  it("should throw an error when a mock user is used while mock mode is disabled", async () => {
    process.env.MOCK_MODE_ENABLED = "false"

    const {handler} = await import("@/handler")

    const response = await handler(mockAPIGatewayProxyEvent, mockContext)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })

    // don't forget to set this back!
    process.env.MOCK_MODE_ENABLED = "true"
  })
})
