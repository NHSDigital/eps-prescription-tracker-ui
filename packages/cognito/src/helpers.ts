import {Logger} from "@aws-lambda-powertools/logger"
import jwt from "jsonwebtoken"
import {ParsedUrlQuery} from "querystring"
import {v4 as uuidv4} from "uuid"

export function rewriteRequestBody(
  logger: Logger,
  objectBodyParameters: ParsedUrlQuery,
  idpTokenPath: string,
  idpCallbackPath: string,
  jwtPrivateKey: jwt.PrivateKey,
  jwtKid: string
): ParsedUrlQuery {
  logger.debug("Updating the callback URI")
  objectBodyParameters.redirect_uri = idpCallbackPath

  logger.debug("Rewriting body to include signed jwt")
  const current_time = Math.floor(Date.now() / 1000)
  const expiration_time = current_time + 300
  const claims = {
    "iss": objectBodyParameters.client_id,
    "sub": objectBodyParameters.client_id,
    "aud": idpTokenPath,
    "iat": current_time,
    "exp": expiration_time,
    "jti": uuidv4()
  }

  const signOptions: jwt.SignOptions = {
    algorithm: "RS512",
    keyid: jwtKid
  }

  logger.debug("Claims", {claims})
  const jwt_token = jwt.sign(claims, jwtPrivateKey, signOptions)
  logger.debug("jwt_token", {jwt_token})
  // rewrite the body to have jwt and remove secret
  objectBodyParameters.client_assertion_type = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
  objectBodyParameters.client_assertion = jwt_token
  delete objectBodyParameters.client_secret
  return objectBodyParameters
}
