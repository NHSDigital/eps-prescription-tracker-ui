import jwt from "jsonwebtoken"
import {Logger} from "@aws-lambda-powertools/logger"
import {ParsedUrlQuery} from "querystring"
import {
  describe,
  expect,
  it,
  vi
} from "vitest"
import {rewriteRequestBody} from "../src/helpers"

// mock jwt.sign before importing rewriteRequestBody
const sign = vi.spyOn(jwt, "sign")
sign.mockImplementation(() => "mocked-jwt-token")

describe("rewriteRequestBody tests", () => {
  const logger = new Logger()
  const jwtPrivateKey = "mockPrivateKey"
  const objectBodyParameters: ParsedUrlQuery = {
    client_id: "test-client-id",
    client_secret: "test-secret"
  }
  const idpTokenPath = "https://example.com/oauth/token"
  const idpCallbackPath = "https://example.com/oauth/idpresponse"

  it("should add a signed JWT to the body parameters", () => {
    const result = rewriteRequestBody(logger,
      objectBodyParameters,
      idpTokenPath,
      idpCallbackPath,
      jwtPrivateKey,
      "dummy_kid"
    )

    expect(result.client_assertion_type).toBe("urn:ietf:params:oauth:client-assertion-type:jwt-bearer")
    expect(result.client_assertion).toBe("mocked-jwt-token")
    expect(result.client_secret).toBeUndefined()
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({
      iss: "test-client-id",
      sub: "test-client-id",
      aud: idpTokenPath
    }), jwtPrivateKey, {algorithm: "RS512", keyid: "dummy_kid"})

    expect(result.redirect_uri).toBe(idpCallbackPath)
  })
})
