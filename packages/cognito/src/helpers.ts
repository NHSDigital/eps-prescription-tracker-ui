import {Logger} from "@aws-lambda-powertools/logger"
import {AxiosResponseHeaders, RawAxiosResponseHeaders} from "axios"
import jwt from "jsonwebtoken"
import jwksClient from "jwks-rsa"
import {ParsedUrlQuery} from "querystring"
import {v4 as uuidv4} from "uuid"

const oidcJwksClient = jwksClient({
  jwksUri: process.env["oidcjwksEndpoint"] as string
})

export function getJWKSKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  oidcJwksClient.getSigningKey(header.kid, function(err, key) {
    const signingKey = key?.getPublicKey()
    callback(err, signingKey)
  })
}

export function verifyJWTWrapper(jwtToVerify: string,
  expectedIssuer: string,
  expectedAudience: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(jwtToVerify, getJWKSKey, {
      audience: expectedAudience,
      issuer: expectedIssuer
    }, function(err, decoded) {
      if (err) {
        reject(err)
      }
      resolve(decoded as jwt.JwtPayload)
    })
  })
}

export function rewriteBodyToAddSignedJWT(
  logger: Logger,
  objectBodyParameters: ParsedUrlQuery,
  idpTokenPath: string,
  jwtPrivateKey: jwt.PrivateKey
): ParsedUrlQuery {
  logger.info("Rewriting body to include signed jwt")
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
    keyid: "eps-cpt-ui-test"
  }

  logger.info("Claims", {claims})
  const jwt_token = jwt.sign(claims, jwtPrivateKey, signOptions)
  logger.info("jwt_token", {jwt_token})
  // rewrite the body to have jwt and remove secret
  objectBodyParameters.client_assertion_type = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
  objectBodyParameters.client_assertion = jwt_token
  delete objectBodyParameters.client_secret
  return objectBodyParameters
}

// eslint-disable-next-line max-len
export function formatHeaders(headers: AxiosResponseHeaders | Partial<RawAxiosResponseHeaders>): { [header: string]: string } {
  const formattedHeaders: { [header: string]: string } = {}

  // Iterate through the Axios headers and ensure values are stringified
  for (const [key, value] of Object.entries(headers)) {
    formattedHeaders[key] = String(value) // Ensure each value is converted to string
  }

  return formattedHeaders
}
