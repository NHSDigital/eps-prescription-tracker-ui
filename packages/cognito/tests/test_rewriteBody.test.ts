import {jest} from "@jest/globals"

import jwt from "jsonwebtoken"
import {Logger} from "@aws-lambda-powertools/logger"
import {ParsedUrlQuery} from "querystring"

// mock jwt.sign before importing rewriteBodyToAddSignedJWT
const sign = jest.spyOn(jwt, "sign")
sign.mockImplementation(() => "mocked-jwt-token")

const {rewriteBodyToAddSignedJWT} = await import("../src/helpers")

describe("rewriteBodyToAddSignedJWT", () => {
  const logger = new Logger()
  const jwtPrivateKey = "mockPrivateKey"
  const objectBodyParameters: ParsedUrlQuery = {
    client_id: "test-client-id",
    client_secret: "test-secret"
  }
  const idpTokenPath = "https://example.com/oauth/token"

  it("should add a signed JWT to the body parameters", () => {
    const result = rewriteBodyToAddSignedJWT(logger, objectBodyParameters, idpTokenPath, jwtPrivateKey)
    expect(result.client_assertion_type).toBe("urn:ietf:params:oauth:client-assertion-type:jwt-bearer")
    expect(result.client_assertion).toBe("mocked-jwt-token")
    expect(result.client_secret).toBeUndefined()
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({
      iss: "test-client-id",
      sub: "test-client-id",
      aud: idpTokenPath
    }), jwtPrivateKey, {algorithm: "RS512", keyid: "eps-cpt-ui-test"})
  })
})
