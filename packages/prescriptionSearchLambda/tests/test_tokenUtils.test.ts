import {jest} from "@jest/globals"
import {verifyJWTWrapper} from "../src/utils/tokenUtils"
import jwt, {SigningKeyCallback, JwtPayload} from "jsonwebtoken"

jest.mock("jwks-rsa", () => {
  return jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn()
  }))
})

describe("tokenUtils tests", () => {
  describe("verifyJWTWrapper", () => {
    it("should verify a valid JWT", async () => {
      const mockDecodedPayload: JwtPayload = {aud: "mock-aud", iss: "mock-iss"}
      jest.spyOn(jwt, "verify").mockImplementation((_token, _key, _options, callback) => {
        // Only first argument of callback (error) is null to indicate success
        (callback as SigningKeyCallback)(null, mockDecodedPayload as unknown as string)
      })

      const token = "mock-token"
      const result = await verifyJWTWrapper(token, "mock-iss", "mock-aud")

      expect(result).toEqual(mockDecodedPayload)
    })

    it("should throw an error for invalid JWT", async () => {
      jest.spyOn(jwt, "verify").mockImplementation((_token, _key, _options, callback) => {
        (callback as SigningKeyCallback)(new jwt.JsonWebTokenError("Invalid JWT"), undefined)
      })

      const token = "mock-token"
      await expect(verifyJWTWrapper(token, "mock-iss", "mock-aud")).rejects.toThrow("Invalid JWT")
    })
  })
})
