import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest"

import {APIGatewayProxyEvent} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import jwksClient from "jwks-rsa"
import jwt from "jsonwebtoken"
import createJWKSMock from "mock-jwks"
import {getSigningKey, verifyIdToken} from "../src/cis2"
import {getUsernameFromEvent} from "../src/event"

// Common test setup
const logger = new Logger()
const oidcClientId = process.env["CIS2_OIDC_CLIENT_ID"]
const oidcIssuer = process.env["CIS2_OIDC_ISSUER"]
const jwksEndpoint = process.env["CIS2_OIDCJWKS_ENDPOINT"]

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
  vi.restoreAllMocks()
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
    vi.restoreAllMocks()
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

describe("verifyIdToken", () => {
  beforeAll(() => {
    vi.resetAllMocks()
  })
  it("should verify a valid ID token", async () => {
    const payload = createPayload()
    const token = createToken(payload)

    vi.spyOn(jwt, "verify").mockImplementation(() => payload)

    await expect(verifyIdToken(token, logger)).resolves.toMatchObject(expect.objectContaining(
      {
        "acr": "AAL3_ANY",
        "aud": ["valid_cis2_aud"],
        "iss": "valid_cis2_iss"
      }
    ))
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

    vi.spyOn(jwt, "decode").mockReturnValueOnce({header: {}})

    await expect(verifyIdToken(token, logger)).rejects.toThrow("Invalid token - no KID present")
  })

  it("should throw an error when jwt.verify fails", async () => {
    const payload = createPayload()
    const token = createToken(payload)

    vi.spyOn(jwt, "verify").mockImplementation(() => {
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
    vi.spyOn(jwt, "verify").mockImplementation(() => payload)

    await expect(verifyIdToken(token, logger)).rejects.toThrow(
      "Invalid ACR claim in ID token"
    )
  })
})
