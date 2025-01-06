import {APIGatewayProxyEvent} from "aws-lambda"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"
import {Logger} from "@aws-lambda-powertools/logger"
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

export const getUsernameFromEvent = (event: APIGatewayProxyEvent): string => {
  const username = event.requestContext.authorizer?.claims["cognito:username"]
  if (!username) {
    throw new Error("Unable to extract username from ID token")
  }
  return username
}

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

  // Verify the tokens
  await verifyIdToken(cis2IdToken, logger)
  await verifyAccessToken(cis2AccessToken, logger)

  // And return the verified tokens
  return {cis2AccessToken, cis2IdToken}
}

export const verifyCIS2Token = async (
  cis2Token: string,
  logger: Logger,
  tokenType: string,
  options: {
      validAcrValues: Array<string>,
      checkAudience: boolean
    }
) => {
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

  logger.info(`Verifying ${tokenType}`, {oidcIssuer, oidcClientId, jwksUri})

  if (!cis2Token) {
    throw new Error(`${tokenType} not provided`)
  }

  // Create a JWKS client
  const client = jwksClient({
    jwksUri: jwksUri,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 3600000 // 1 hour
  })

  // Decode the token header to get the kid
  const decodedToken = jwt.decode(cis2Token, {complete: true})
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

  // Verify the token signature
  const verifyOptions: jwt.VerifyOptions = {
    issuer: oidcIssuer,
    clockTolerance: 5 // seconds
  }
  // ID tokens have an aud claim, access tokens don't
  if (options.checkAudience) {
    verifyOptions.audience = oidcClientId
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
}

export const verifyIdToken = async (idToken: string, logger: Logger) => {
  await verifyCIS2Token(
    idToken,
    logger,
    "ID token",
    {
      validAcrValues: VALID_ACR_VALUES,
      checkAudience: true
    }
  )
}

export const verifyAccessToken = async (accessToken: string, logger: Logger) => {
  await verifyCIS2Token(
    accessToken,
    logger,
    "Access token",
    {
      validAcrValues: VALID_ACR_VALUES,
      checkAudience: false
    }
  )
}
