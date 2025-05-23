import {Logger} from "@aws-lambda-powertools/logger"
import jwt, {JwtPayload} from "jsonwebtoken"
import jwksClient from "jwks-rsa"
import {initializeOidcConfig} from "./initialization"
const {cis2OidcConfig} = initializeOidcConfig()
const VALID_ACR_VALUES: Array<string> = [
  "AAL3_ANY",
  // "AAL2_OR_AAL3_ANY",
  // "AAL2_ANY",
  // "AAL1_USERPASS",
  // Additional AMR values that may be requested
  "AAL3_IOS",
  "AAL3_FIDO2",
  "AAL3_N3_SMARTCARD",
  "AAL3_CIS2_SMARTCARD",
  "AAL3_SMARTCARD"
  // "AAL2_TOTP",
  // "AAL2_NHSMAIL"
]

/**
 * Helper function to get the signing key from the JWKS endpoint
 * @param client - a jwks client
 * @param kid - a KID (key identifier) to get
 * @returns a promise with the public key
 * @throws if key not found on jwks url
*/
export const getSigningKey = (client: jwksClient.JwksClient, kid: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err)
      } else {
        if (!key) {
          reject(new Error("Key not found"))
        }
        const signingKey = key!.getPublicKey()
        resolve(signingKey)
      }
    })
  })
}

/**
 * Interface for passing around oidc config
 */
export interface OidcConfig {
  oidcIssuer: string
  oidcClientID: string
  oidcJwksEndpoint: string
  oidcUserInfoEndpoint: string
  oidcTokenEndpoint: string
  userPoolIdp: string
  jwksClient: jwksClient.JwksClient,
  tokenMappingTableName: string
}

export const decodeToken = (token: string): JwtPayload => {
  const decodedToken = jwt.decode(token, {complete: true})
  if (!decodedToken || typeof decodedToken === "string") {
    throw new Error("Invalid token - token is either undefined or a string")
  }
  if (!decodedToken.header.kid) {
    throw new Error("Invalid token - no KID present")
  }
  return decodedToken as JwtPayload
}

/**
 * Helper function for verifying a cis2 token
 * @param cis2Token - the token to verify
 * @param logger - Logger instance for logging
 * @param tokenType - the type of token to check
 * @param options - options for verification
 * @param oidcConfig - the oidc config to use for verifying
 * @returns the decoded token
 * @throws if token fails verification
 */
export const verifyCIS2Token = async (
  cis2Token: string,
  logger: Logger,
  tokenType: string,
  options: {
        validAcrValues: Array<string>,
        checkAudience: boolean
      }
): Promise<jwt.JwtPayload> => {
  if (cis2OidcConfig.oidcIssuer === "") {
    throw new Error("OIDC issuer not set")
  }
  if (cis2OidcConfig.oidcClientID === "") {
    throw new Error("OIDC client ID not set")
  }
  if (cis2OidcConfig.oidcJwksEndpoint === "") {
    throw new Error("JWKS URI not set")
  }

  logger.info(`Verifying ${tokenType}`, {cis2OidcConfig})

  if (!cis2Token) {
    throw new Error(`${tokenType} not provided`)
  }

  // Decode the token header to get the kid
  // const decodedToken = jwt.decode(cis2Token, {complete: true})
  const decodedToken = decodeToken(cis2Token)
  const kid = decodedToken.header.kid
  logger.info("Token KID", {kid})

  // Fetch the signing key from the JWKS endpoint
  let signingKey
  try {
    logger.info("Fetching signing key", {kid})
    signingKey = await getSigningKey(cis2OidcConfig.jwksClient, kid)
  } catch (err) {
    logger.error("Error getting signing key", {err})
    throw new Error("Error getting signing key")
  }
  logger.info("Signing key fetched successfully")

  // Verify the token signature
  const verifyOptions: jwt.VerifyOptions = {
    issuer: cis2OidcConfig.oidcIssuer,
    clockTolerance: 5 // seconds
  }
  // ID tokens have an aud claim, access tokens don't
  if (options.checkAudience) {
    verifyOptions.audience = cis2OidcConfig.oidcClientID
  }

  let verifiedToken: JwtPayload
  try {
    verifiedToken = jwt.verify(cis2Token, signingKey, verifyOptions) as JwtPayload
  } catch (err) {
    logger.error("Error verifying token", {err})
    throw new Error(`Invalid ${tokenType} - JWT verification failed`)
  }
  logger.info(`${tokenType} verified successfully`, {verifiedToken})

  // Manual Verification checks
  let acr = verifiedToken.acr
  if (!acr) {
    logger.info("No ACR claim from the token. Assuming AAL3_ANY")
    acr = "AAL3_ANY"
  }

  let validAcr = false
  if (acr.startsWith("AAL3_")) {
    logger.info("ACR claim starts with AAL3_, so is valid", {acr})
    validAcr = true
  }
  if (options.validAcrValues.includes(acr)) {
    logger.info("ACR claim is in the list of valid values", {acr})
    validAcr = true
  }
  if (!validAcr) {
    throw new Error(`Invalid ACR claim in ${tokenType}`)
  }
  logger.debug("ACR claim is valid", {acr})

  return verifiedToken
}

/**
 * Heleper function verify a CIS2 id token
 * @param idToken - the id token to verify
 * @param logger - Logger instance for logging
 * @param oidcConfig - the oidc config to use for verifying
 * @returns the decoded id token
 */
export const verifyIdToken = async (
  idToken: string,
  logger: Logger
) : Promise<jwt.JwtPayload> => {
  return await verifyCIS2Token(
    idToken,
    logger,
    "ID token",
    {
      validAcrValues: VALID_ACR_VALUES,
      checkAudience: true
    }
  )
}
