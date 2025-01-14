import {jest} from "@jest/globals"

import jwt from "jsonwebtoken"
import {Logger} from "@aws-lambda-powertools/logger"

// mock jwt.sign before importing constructSignedJWTBody
const sign = jest.spyOn(jwt, "sign")
sign.mockImplementation(() => "mocked-jwt-token")

const {constructSignedJWTBody} = await import("../src/apigee")

describe("constructSignedJWTBody tests", () => {
  const logger = new Logger()
  const jwtPrivateKey = "mockPrivateKey"
  const idpTokenPath = "https://example.com/oauth/token"
  const apigeeToken = "dummyApigeeToken"

  it("should add a signed JWT to the body parameters", () => {
    const result = constructSignedJWTBody(
      logger,
      idpTokenPath,
      jwtPrivateKey,
      apigeeToken,
      "dummy_kid",
      "dummy_cis2IdToken"
    )

    // Validate the rewritten body parameters
    expect(result.client_assertion_type).toBe("urn:ietf:params:oauth:client-assertion-type:jwt-bearer")
    expect(result.client_assertion).toBe("mocked-jwt-token")
    expect(result.client_secret).toBeUndefined()

    // Validate that `sign` was called with the correct arguments
    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({
        iss: "dummyApigeeToken",
        sub: "dummyApigeeToken",
        aud: idpTokenPath
      }),
      jwtPrivateKey,
      {
        algorithm: "RS512",
        header: {
          alg: "RS512",
          typ: "JWT",
          kid: "dummy_kid"
        }
      }
    )
  })
})
