import {jest} from "@jest/globals"

import {
  getSigningKey,
  getUsernameFromEvent,
  fetchCIS2TokensFromDynamoDB,
  fetchAndVerifyCIS2Tokens,
  verifyIdToken,
  verifyAccessToken
} from "../src/cis2TokenHelpers"

import {APIGatewayProxyEvent} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import jwksClient from "jwks-rsa"
import jwt from "jsonwebtoken"
import {createJWKSMock} from "mock-jwks"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"

// Common test setup
const logger = new Logger()
const oidcClientId = process.env["oidcClientId"] as string
const oidcIssuer = process.env["oidcIssuer"] as string
const jwksEndpoint = process.env["oidcjwksEndpoint"] as string

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
  const jwksEndpoint = process.env["oidcjwksEndpoint"] as string

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
  const cis2IdToken: jwt.JwtPayload = {
    iss: process.env["oidcIssuer"],
    aud: process.env["oidcClientId"],
    exp: Math.floor(Date.now() / 1000) + 3600,
    acr: "AAL3_ANY",
    auth_time: Math.floor(Date.now() / 1000)
  }
  const cis2AccessToken = "test-access-token"

  const originalTokenMappingTableName = process.env["TokenMappingTableName"]

  beforeEach(() => {
    jest.restoreAllMocks()
    process.env["TokenMappingTableName"] = originalTokenMappingTableName
  })

  afterEach(() => {
    delete process.env["TokenMappingTableName"]
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
      fetchAndVerifyCIS2Tokens(event, documentClient, logger)
    ).resolves.toEqual({
      cis2AccessToken,
      cis2IdToken
    })
  })

  it("should throw an error if TokenMappingTableName is not set", async () => {
    delete process.env["TokenMappingTableName"]

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
      fetchAndVerifyCIS2Tokens(event, documentClient, logger)
    ).rejects.toThrow("Token mapping table name not set")
  })
})

describe("verifyIdToken", () => {
  it("should verify a valid ID token", async () => {
    const payload = createPayload()
    const token = createToken(payload)

    jest.spyOn(jwt, "verify").mockImplementation(() => payload)

    await expect(verifyIdToken(token, logger)).resolves.toBeUndefined()
  })

  it("should throw an error when ID token is not provided", async () => {
    await expect(verifyIdToken("", logger)).rejects.toThrow("ID token not provided")
  })

  it("should throw an error when ID token cannot be decoded", async () => {
    await expect(verifyIdToken("invalid-token", logger)).rejects.toThrow("Invalid token")
  })

  it("should throw an error when ID token header does not contain kid", async () => {
    const payload = createPayload()
    const token = createToken(payload)

    jest.spyOn(jwt, "decode").mockReturnValueOnce({header: {}})

    await expect(verifyIdToken(token, logger)).rejects.toThrow("Invalid token - no KID present")
  })

  it("should throw an error when jwt.verify fails", async () => {
    const payload = createPayload()
    const token = createToken(payload)

    jest.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("Invalid signature")
    })

    await expect(verifyIdToken(token, logger)).rejects.toThrow("Invalid ID token")
  })

  it("should throw an error when ID token is expired", async () => {
    const payload = createPayload({
      exp: Math.floor(Date.now() / 1000) - 3600,
      auth_time: Math.floor(Date.now() / 1000) - 7200
    })
    const token = createToken(payload)

    await expect(verifyIdToken(token, logger)).rejects.toThrow(
      "Invalid ID token - JWT verification failed"
    )
  })

  it("should throw an error when issuer does not match", async () => {
    const payload = createPayload({iss: "https://wrong-issuer.com"})
    const token = createToken(payload)

    await expect(verifyIdToken(token, logger)).rejects.toThrow(
      "Invalid ID token - JWT verification failed"
    )
  })

  it("should throw an error when audience does not match", async () => {
    const payload = createPayload({aud: ["wrong-client-id"]})
    const token = createToken(payload)

    await expect(verifyIdToken(token, logger)).rejects.toThrow(
      "Invalid ID token - JWT verification failed"
    )
  })

  it("should throw an error when ACR claim is invalid", async () => {
    const payload = createPayload({acr: "INVALID_ACR"})
    const token = createToken(payload)

    await expect(verifyIdToken(token, logger)).rejects.toThrow(
      "Invalid ACR claim in ID token"
    )
  })
})

describe("verifyAccessToken", () => {
  it("should verify a valid access token", async () => {
    const payload = createPayload()
    const token = createToken(payload)

    jest.spyOn(jwt, "verify").mockImplementation(() => payload)

    await expect(verifyAccessToken(token, logger)).resolves.toBeUndefined()
  })

  it("should throw an error when access token is not provided", async () => {
    await expect(verifyAccessToken("", logger)).rejects.toThrow("Access token not provided")
  })

  it("should throw an error when access token cannot be decoded", async () => {
    await expect(verifyAccessToken("invalid-token", logger)).rejects.toThrow("Invalid token")
  })

  it("should throw an error when access token header does not contain kid", async () => {
    const payload = createPayload()
    const token = createToken(payload)

    jest.spyOn(jwt, "decode").mockReturnValueOnce({header: {}})

    await expect(verifyAccessToken(token, logger)).rejects.toThrow("Invalid token - no KID present")
  })

  it("should throw an error when jwt.verify fails", async () => {
    const payload = createPayload()
    const token = createToken(payload)

    jest.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("Invalid signature")
    })

    await expect(verifyAccessToken(token, logger)).rejects.toThrow(
      "Invalid Access token - JWT verification failed"
    )
  })

  it("should throw an error when access token is expired", async () => {
    const payload = createPayload({
      exp: Math.floor(Date.now() / 1000) - 3600,
      auth_time: Math.floor(Date.now() / 1000) - 7200
    })
    const token = createToken(payload)

    await expect(verifyAccessToken(token, logger)).rejects.toThrow(
      "Invalid Access token - JWT verification failed"
    )
  })

  it("should throw an error when issuer does not match", async () => {
    const payload = createPayload({iss: "https://wrong-issuer.com"})
    const token = createToken(payload)

    await expect(verifyAccessToken(token, logger)).rejects.toThrow(
      "Invalid Access token - JWT verification failed"
    )
  })

  it("should throw an error when ACR claim is invalid", async () => {
    const payload = createPayload({acr: "INVALID_ACR"})
    const token = createToken(payload)

    await expect(verifyAccessToken(token, logger)).rejects.toThrow(
      "Invalid ACR claim in Access token"
    )
  })
})
