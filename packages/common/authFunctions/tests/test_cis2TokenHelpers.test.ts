import {jest} from "@jest/globals"

import {
  getSigningKey,
  getUsernameFromEvent,
  fetchCIS2TokensFromDynamoDB,
  fetchAndVerifyCIS2Tokens,
  verifyIdToken,
  OidcConfig
} from "../src/index"

import {APIGatewayProxyEvent} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import jwksClient from "jwks-rsa"
import jwt from "jsonwebtoken"
import createJWKSMock from "mock-jwks"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"

// Common test setup
const logger = new Logger()
const oidcClientId = "valid_aud"
const oidcIssuer = "valid_iss"
const jwksEndpoint = "https://dummyauth.com/.well-known/jwks.json"

let jwksMock: ReturnType<typeof createJWKSMock>
let stopJwksMock: () => void

beforeAll(() => {
  jwksMock = createJWKSMock(jwksEndpoint)
  stopJwksMock = jwksMock.start()
})

afterAll(() => {
  stopJwksMock()
})

beforeEach(() => {
  jest.restoreAllMocks()
})

interface TokenPayload {
  iss: string;
  aud: Array<string>;
  exp: number;
  acr: string;
  auth_time: number;
  [key: string]: unknown;
}

function createPayload(overrides: Partial<TokenPayload> = {}): TokenPayload {
  return {
    iss: oidcIssuer,
    aud: [oidcClientId],
    exp: Math.floor(Date.now() / 1000) + 3600,
    acr: "AAL3_ANY",
    auth_time: Math.floor(Date.now() / 1000),
    ...overrides
  }
}

function createToken(payload: jwt.JwtPayload | undefined): string {
  return jwksMock.token(payload)
}

describe("getSigningKey", () => {
  let jwksMock: ReturnType<typeof createJWKSMock>
  let stopJwksMock: () => void

  const client = jwksClient({
    jwksUri: `${jwksEndpoint}`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 3600000 // 1 hour
  })

  beforeAll(() => {
    jwksMock = createJWKSMock(jwksEndpoint)
    stopJwksMock = jwksMock.start()
  })

  afterAll(() => {
    stopJwksMock()
  })

  beforeEach(() => {
    jest.restoreAllMocks()
  })

  // it("should return the signing key when key is found", async () => {
  //   const kid = jwksMock.kid()

  //   const key = await getSigningKey(client, kid)
  //   expect(key).toBeDefined()
  // })

  it("should throw an error when key is not found", async () => {
    const kid = "non-existent-key-id"

    await expect(getSigningKey(client, kid))
      .rejects
      .toThrow("Unable to find a signing key that matches 'non-existent-key-id'")
  })
})

describe("getUsernameFromEvent", () => {
  it("should extract the username from the event", () => {
    const event = {
      requestContext: {
        authorizer: {
          claims: {
            "cognito:username": "test-username"
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    const username = getUsernameFromEvent(event)
    expect(username).toBe("test-username")
  })

  it("should throw an error if username is not present", () => {
    const event = {
      requestContext: {
        authorizer: {
          claims: {}
        }
      }
    } as unknown as APIGatewayProxyEvent

    expect(() => getUsernameFromEvent(event)).toThrow(
      "Unable to extract username from ID token"
    )
  })
})

describe("fetchCIS2TokensFromDynamoDB", () => {
  const logger = new Logger()
  const dynamoDBClient = new DynamoDBClient({})
  const documentClient = DynamoDBDocumentClient.from(dynamoDBClient)

  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it("should fetch tokens from DynamoDB", async () => {
    const username = "test-username"
    const tableName = "TokenMappingTable"

    const cis2AccessToken = "test-access-token"
    const cis2IdToken = "test-id-token"

    jest.spyOn(documentClient, "send")
      .mockImplementation(() => Promise.resolve({
        Item: {
          CIS2_accessToken: cis2AccessToken,
          CIS2_idToken: cis2IdToken
        }
      })
      )

    const result = await fetchCIS2TokensFromDynamoDB(
      username,
      tableName,
      documentClient,
      logger
    )
    expect(result).toEqual({cis2AccessToken, cis2IdToken})

    expect(documentClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TableName: tableName,
          Key: {username}
        }
      })
    )
  })

  it("should throw an error if tokens not found", async () => {
    const username = "test-username"
    const tableName = "TokenMappingTable"

    jest.spyOn(documentClient, "send").mockImplementation(() => Promise.resolve({}))

    await expect(
      fetchCIS2TokensFromDynamoDB(username, tableName, documentClient, logger)
    ).rejects.toThrow("CIS2 access token not found for user")
  })

  it("should throw an error on DynamoDB error", async () => {
    const username = "test-username"
    const tableName = "TokenMappingTable"

    jest
      .spyOn(documentClient, "send")
      .mockImplementation(() => Promise.reject(new Error("DynamoDB error")))

    await expect(
      fetchCIS2TokensFromDynamoDB(username, tableName, documentClient, logger)
    ).rejects.toThrow("Internal server error while accessing DynamoDB")
  })
})

describe("fetchAndVerifyCIS2Tokens", () => {
  const dynamoDBClient = new DynamoDBClient({})
  const documentClient = DynamoDBDocumentClient.from(dynamoDBClient)

  const username = "test-username"
  const oidcIssuer = "valid_iss"
  const oidcClientId = "valid_aud"
  const cis2IdToken: jwt.JwtPayload = {
    iss: oidcIssuer,
    aud: oidcClientId,
    exp: Math.floor(Date.now() / 1000) + 3600,
    acr: "AAL3_ANY",
    auth_time: Math.floor(Date.now() / 1000)
  }
  const cis2AccessToken = "test-access-token"
  const client = jwksClient({
    jwksUri: `${jwksEndpoint}`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 3600000 // 1 hour
  })

  const oidcConfig: OidcConfig = {
    oidcIssuer: oidcIssuer,
    oidcClientID: oidcClientId,
    oidcJwksEndpoint: "https://dummyauth.com/.well-known/jwks.json",
    oidcUserInfoEndpoint:  "https://dummyauth.com/userinfo",
    userPoolIdp: "DummyPoolIdentityProvider",
    tokenMappingTableName: "dummyTable",
    jwksClient: client
  }

  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it("should fetch and verify tokens", async () => {

    const event = {
      requestContext: {
        authorizer: {
          claims: {
            "cognito:username": username
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    jest.spyOn(documentClient, "send")
      .mockImplementation(() => Promise.resolve({
        Item: {
          CIS2_accessToken: cis2AccessToken,
          CIS2_idToken: cis2IdToken
        }
      })
      )

    const validKid = jwksMock.kid()

    jest.spyOn(jwt, "decode").mockReturnValue({
      header: {kid: validKid}
    })

    jest.spyOn(jwt, "verify").mockImplementation(() => cis2IdToken)

    await expect(
      fetchAndVerifyCIS2Tokens(event, documentClient, logger, oidcConfig)
    ).resolves.toEqual({
      cis2AccessToken,
      cis2IdToken
    })
  })

  it("should throw an error if TokenMappingTableName is not set", async () => {
    const clonedOidcConfig = {
      ...oidcConfig
    }
    clonedOidcConfig.tokenMappingTableName = ""

    const event = {
      requestContext: {
        authorizer: {
          claims: {
            "cognito:username": "test-username"
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    await expect(
      fetchAndVerifyCIS2Tokens(event, documentClient, logger, clonedOidcConfig)
    ).rejects.toThrow("Token mapping table name not set")
  })
})

describe("verifyIdToken", () => {
  const oidcIssuer = "valid_iss"
  const oidcClientId = "valid_aud"
  const client = jwksClient({
    jwksUri: `${jwksEndpoint}`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 3600000 // 1 hour
  })

  const oidcConfig: OidcConfig = {
    oidcIssuer: oidcIssuer,
    oidcClientID: oidcClientId,
    oidcJwksEndpoint: "https://dummyauth.com/.well-known/jwks.json",
    oidcUserInfoEndpoint:  "https://dummyauth.com/userinfo",
    userPoolIdp: "DummyPoolIdentityProvider",
    tokenMappingTableName: "dummyTable",
    jwksClient: client
  }
  it("should verify a valid ID token", async () => {
    const payload = createPayload()
    const token = createToken(payload)

    jest.spyOn(jwt, "verify").mockImplementation(() => payload)

    await expect(verifyIdToken(token, logger, oidcConfig)).resolves.toMatchObject(expect.objectContaining(
      {
        "acr": "AAL3_ANY",
        "aud": ["valid_aud"],
        "iss": "valid_iss"
      }
    ))
  })

  it("should throw an error when ID token is not provided", async () => {
    await expect(verifyIdToken("", logger, oidcConfig)).rejects.toThrow("ID token not provided")
  })

  it("should throw an error when ID token cannot be decoded", async () => {
    await expect(verifyIdToken("invalid-token", logger, oidcConfig)).rejects.toThrow("Invalid token")
  })

  it("should throw an error when ID token header does not contain kid", async () => {
    const payload = createPayload()
    const token = createToken(payload)

    jest.spyOn(jwt, "decode").mockReturnValueOnce({header: {}})

    await expect(verifyIdToken(token, logger, oidcConfig)).rejects.toThrow("Invalid token - no KID present")
  })

  it("should throw an error when jwt.verify fails", async () => {
    const payload = createPayload()
    const token = createToken(payload)

    jest.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("Invalid signature")
    })

    await expect(verifyIdToken(token, logger, oidcConfig)).rejects.toThrow("Invalid ID token")
  })

  it("should throw an error when ID token is expired", async () => {
    const payload = createPayload({
      exp: Math.floor(Date.now() / 1000) - 3600,
      auth_time: Math.floor(Date.now() / 1000) - 7200
    })
    const token = createToken(payload)

    await expect(verifyIdToken(token, logger, oidcConfig)).rejects.toThrow(
      "Invalid ID token - JWT verification failed"
    )
  })

  it("should throw an error when issuer does not match", async () => {
    const payload = createPayload({iss: "https://wrong-issuer.com"})
    const token = createToken(payload)

    await expect(verifyIdToken(token, logger, oidcConfig)).rejects.toThrow(
      "Invalid ID token - JWT verification failed"
    )
  })

  it("should throw an error when audience does not match", async () => {
    const payload = createPayload({aud: ["wrong-client-id"]})
    const token = createToken(payload)

    await expect(verifyIdToken(token, logger, oidcConfig)).rejects.toThrow(
      "Invalid ID token - JWT verification failed"
    )
  })

  it("should throw an error when ACR claim is invalid", async () => {
    const payload = createPayload({acr: "INVALID_ACR"})
    const token = createToken(payload)

    await expect(verifyIdToken(token, logger, oidcConfig)).rejects.toThrow(
      "Invalid ACR claim in ID token"
    )
  })
})
