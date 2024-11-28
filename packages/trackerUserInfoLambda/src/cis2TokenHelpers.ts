import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent} from "aws-lambda"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"
import jwt, {JwtPayload} from "jsonwebtoken"
import jwksClient from "jwks-rsa"

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

// Helper function to get the signing key from the JWKS endpoint
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

export const getUsernameFromEvent = (event: APIGatewayProxyEvent): string => {
  const username = event.requestContext.authorizer?.claims["cognito:username"]
  if (!username) {
    throw new Error("Unable to extract username from ID token")
  }
  return username
}

export const fetchCIS2TokensFromDynamoDB = async (
  username: string,
  tokenMappingTableName: string,
  documentClient: DynamoDBDocumentClient,
  logger: Logger
): Promise<{ cis2AccessToken: string; cis2IdToken: string }> => {
  logger.info("Fetching CIS2 access token from DynamoDB")

  let result

  try {
    result = await documentClient.send(
      new GetCommand({
        TableName: tokenMappingTableName,
        Key: {username}
      })
    )
    logger.debug("DynamoDB response", {result})
  } catch (error) {
    logger.error("Error fetching data from DynamoDB", {error})
    throw new Error("Internal server error while accessing DynamoDB")
  }

  if (result.Item) {
    const existingData = result.Item
    return {
      cis2AccessToken: existingData.CIS2_accessToken,
      cis2IdToken: existingData.CIS2_idToken
    }
  } else {
    logger.error("CIS2 access token not found for user")
    throw new Error("CIS2 access token not found for user")
  }
}

export const fetchAndVerifyCIS2Tokens = async (
  event: APIGatewayProxyEvent,
  documentClient: DynamoDBDocumentClient,
  logger: Logger
) => {
  logger.info("Fetching and verifying CIS2 tokens")

  const tokenMappingTableName = process.env["TokenMappingTableName"]
  if (!tokenMappingTableName) {
    throw new Error("Token mapping table name not set")
  }

  // Extract username
  const username = getUsernameFromEvent(event)
  logger.info("Extracted username from ID token", {username})

  // Fetch CIS2 tokens from DynamoDB
  const {cis2AccessToken, cis2IdToken} = await fetchCIS2TokensFromDynamoDB(
    username,
    tokenMappingTableName,
    documentClient,
    logger
  )

  // Verify the ID token
  await verifyIdToken(cis2IdToken, logger)

  // And return the verified tokens
  return {cis2AccessToken, cis2IdToken}
}

export const verifyIdToken = async (idToken: string, logger: Logger) => {
  const oidcIssuer = process.env["oidcIssuer"]
  if (!oidcIssuer) {
    throw new Error("OIDC issuer not set")
  }
  const oidcClientId = process.env["oidcClientId"]
  if (!oidcClientId) {
    throw new Error("OIDC client ID not set")
  }
  const jwksUri = process.env["oidcjwksEndpoint"]
  if (!jwksUri) {
    throw new Error("JWKS URI not set")
  }

  logger.info("Verifying ID token", {oidcIssuer, oidcClientId, jwksUri})

  if (!idToken) {
    throw new Error("ID token not provided")
  }

  // Create a JWKS client
  const client = jwksClient({
    jwksUri: `${jwksUri}`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 3600000 // 1 hour
  })

  // Decode the token header to get the kid
  const decodedToken = jwt.decode(idToken, {complete: true})
  if (!decodedToken || typeof decodedToken === "string") {
    throw new Error("Invalid token - token is either undefined or a string")
  }
  const kid = decodedToken.header.kid
  if (!kid) {
    throw new Error("Invalid token - no KID present")
  }
  logger.info("Token KID", {kid})

  // Fetch the signing key from the JWKS endpoint
  let signingKey
  try {
    logger.info("Fetching signing key", {kid})
    signingKey = await getSigningKey(client, kid)
  } catch (err) {
    logger.error("Error getting signing key", {err})
    throw new Error("Error getting signing key")
  }
  logger.info("Signing key fetched successfully")

  // Verify the token
  const options = {
    issuer: oidcIssuer,
    audience: oidcClientId,
    clockTolerance: 5 // seconds
  }

  let verifiedToken: JwtPayload
  try {
    verifiedToken = jwt.verify(idToken, signingKey, options) as JwtPayload
  } catch (err) {
    logger.error("Error verifying token", {err})
    throw new Error("Invalid ID token - JWT verification failed")
  }
  logger.info("ID token verified successfully", {verifiedToken})

  // Manual Verification checks,
  // c.f. https://tinyurl.com/2rz5xxup

  // Check that token hasn't expired (verification step above should do this, but just in case)
  const now = Math.floor(Date.now() / 1000)
  if (verifiedToken.exp && verifiedToken.exp < now) {
    throw new Error("ID token has expired")
  }
  logger.info("Token has not expired", {exp: verifiedToken.exp})

  // the iss claim MUST exactly match the issuer in the OIDC configuration
  // This is checked by the `jwt.verify` function

  // the aud MUST contain our relying party client_id value
  // This is checked by the `jwt.verify` function

  // Not-checked check!
  // From what I can tell, we're not using a known nonce. If we do end up using one, we should check it here.

  // The `acr` claim must be present and have a valid value
  let acr = verifiedToken.acr
  if (!acr) {
    logger.info("No ACR claim from the token. Assuming AAL3_ANY")
    acr = "AAL3_ANY"
  }

  let valid_acr = false
  // If it starts with "AAL3_", it's valid
  if (acr.startsWith("AAL3_")) {
    logger.info("ACR claim starts with AAL3_, so is valid", {acr})
    valid_acr = true
  }
  if (VALID_ACR_VALUES.includes(acr)) {
    logger.info("ACR claim is in the list of valid values", {acr})
    valid_acr = true
  }
  if (!valid_acr) {
    throw new Error("Invalid ACR claim in ID token")
  }
  logger.debug("acr claim is valid", {acr})

  // We don't check the auth_time claim here.
  // From the docs:
  //   It is anticipated that Relying Parties will only require access to the UserInfo Endpoint at the time of the
  //   original End-User authentication. This should only happen once as part of a Relying Party authentication
  //   journey and the Access Token can be used immediately, then discarded. In NHS CIS2 Authentication, there should
  //   be no other need to retrieve the User Info after this point in time.
  //   Therefore the use of the Refresh Token to obtain a new Access Token is not recommended.
}
