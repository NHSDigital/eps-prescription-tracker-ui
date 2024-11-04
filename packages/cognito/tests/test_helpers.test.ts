import {formatHeaders, verifyJWTWrapper} from "../src/helpers"
import createJWKSMock from "mock-jwks"
import jwt from "jsonwebtoken"

describe("Auth Test", () => {
  const jwks = createJWKSMock("https://dummyauth.com/")

  beforeEach(() => {
    jwks.start()
  })

  afterEach(() => {
    jwks.stop()
  })

  it("should verify a valid token", async () => {
    const token = jwks.token({
      iss: "valid_iss",
      aud: "valid_aud"
    })

    const data = await verifyJWTWrapper(token, "valid_iss", "valid_aud")

    expect(data.aud).toEqual("valid_aud")
    expect(data.iss).toEqual("valid_iss")
  })

  it("should reject an expired token", async () => {
    expect.assertions(1)
    const token = jwks.token({
      iss: "valid_iss",
      aud: "valid_aud",
      exp: 0
    })

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const data = await verifyJWTWrapper(token, "valid_iss", "valid_aud")
    } catch (error) {
      expect(error).toEqual(new jwt.TokenExpiredError("jwt expired", new Date()))
    }
  })

  it("should reject a token with invalid iss", async () => {
    expect.assertions(1)
    const token = jwks.token({
      iss: "invalid_iss",
      aud: "valid_aud"
    })

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const data = await verifyJWTWrapper(token, "valid_iss", "valid_aud")
    } catch (error) {
      expect(error).toEqual(new jwt.JsonWebTokenError("jwt issuer invalid. expected: valid_iss"))
    }
  })

  it("should reject a token with invalid aud", async () => {
    expect.assertions(1)
    const token = jwks.token({
      iss: "valid_iss",
      aud: "invalid_aud"
    })

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const data = await verifyJWTWrapper(token, "valid_iss", "valid_aud")
    } catch (error) {
      expect(error).toEqual(new jwt.JsonWebTokenError("jwt audience invalid. expected: valid_aud"))
    }
  })
})

describe("formatHeaders", () => {
  it("should convert header values to strings", () => {
    const headers = {
      "content-type": "application/json",
      "x-custom-header": 12345
    }

    const result = formatHeaders(headers)
    expect(result).toEqual({
      "content-type": "application/json",
      "x-custom-header": "12345"
    })
  })
})
