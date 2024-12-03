import {Logger} from "@aws-lambda-powertools/logger"
import jwt from "jsonwebtoken"
import jwksClient from "jwks-rsa"
import {ParsedUrlQuery} from "querystring"
import {v4 as uuidv4} from "uuid"

// JWKS client setup
const oidcJwksClient = jwksClient({
  jwksUri: process.env["oidcjwksEndpoint"] as string
})

/**
 * Retrieves the signing key from the JWKS endpoint
 * @param header - JWT header
 * @param callback - Callback function
 */
export function getJWKSKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  oidcJwksClient.getSigningKey(header.kid, function(err, key) {
    const signingKey = key?.getPublicKey()
    callback(err, signingKey)
  })
}

/**
 * Verifies the given JWT using the expected issuer and audience
 * @param jwtToVerify - JWT string to verify
 * @param expectedIssuer - Expected issuer of the JWT
 * @param expectedAudience - Expected audience of the JWT
 * @returns Promise resolving to the decoded JWT payload
 */
export function verifyJWTWrapper(
  jwtToVerify: string,
  expectedIssuer: string,
  expectedAudience: string
): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      jwtToVerify,
      getJWKSKey,
      {audience: expectedAudience, issuer: expectedIssuer},
      function(err, decoded) {
        if (err) {
          reject(err)
        }
        resolve(decoded as jwt.JwtPayload)
      }
    )
  })
}

/**
 * Constructs a new body for the token exchange, including a signed JWT
 * @param logger - Logger instance for logging
 * @param objectBodyParameters - Original body parameters
 * @param idpTokenPath - Token endpoint
 * @param jwtPrivateKey - Private key for signing the JWT
 * @param apigeeApiKey - API key for Apigee
 * @param jwtKid - Key ID for the JWT
 * @returns Modified body with signed JWT included
 */
export function constructSignedJWTBody(
  logger: Logger,
  objectBodyParameters: ParsedUrlQuery,
  idpTokenPath: string,
  jwtPrivateKey: jwt.PrivateKey,
  apigeeApiKey: string,
  jwtKid: string
): ParsedUrlQuery {
  logger.info("Constructing new body to include signed JWT", {idpTokenPath})

  const current_time = Math.floor(Date.now() / 1000)
  const expiration_time = current_time + 300

  const claims = {
    iss: apigeeApiKey,
    sub: apigeeApiKey,
    aud: idpTokenPath,
    iat: current_time,
    exp: expiration_time,
    jti: uuidv4()
  }

  const signOptions: jwt.SignOptions = {
    algorithm: "RS512",
    header: {
      alg: "RS512",
      typ: "JWT",
      kid: jwtKid
    }
  }

  logger.info("JWT claims prepared for signing", {claims})
  const jwt_token = jwt.sign(claims, jwtPrivateKey, signOptions)
  logger.info("Generated JWT token", {jwt_token})

  // Rewrite the body to have JWT and remove the secret
  objectBodyParameters.client_assertion_type = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
  objectBodyParameters.client_assertion = jwt_token
  delete objectBodyParameters.client_secret

  return objectBodyParameters
}
