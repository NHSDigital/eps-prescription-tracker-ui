import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent} from "aws-lambda"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"
import jwt, {JwtPayload} from "jsonwebtoken"
import jwksClient from "jwks-rsa"

const VALID_ACR_VALUES = ["AAL3_CIS2_SMARTCARD"]

// Helper function to fetch the signing key from the JWKS endpoint
export const getSigningKey = (client: jwksClient.JwksClient, kid: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err || !key) {
        reject(new Error(`Signing key retrieval failed: ${err?.message || "Key not found"}`))
      } else {
        resolve(key.getPublicKey())
      }
    })
  })
}

// Extract the username from Cognito claims in the API Gateway event
export const getUsernameFromEvent = (event: APIGatewayProxyEvent): string => {
  const username = event.requestContext.authorizer?.claims["cognito:username"]
  if (!username) {
    throw new Error("Unable to extract username from Cognito claims.")
  }
  return username
}

// Fetch CIS2 tokens from DynamoDB
export const fetchCIS2TokensFromDynamoDB = async (
  username: string,
  tokenMappingTableName: string,
  documentClient: DynamoDBDocumentClient,
  logger: Logger
): Promise<{cis2AccessToken: string; cis2IdToken: string}> => {
  logger.info("Fetching CIS2 tokens from DynamoDB", {username})

  const result = await documentClient.send(
    new GetCommand({
      TableName: tokenMappingTableName,
      Key: {username}
    })
  )

  if (!result.Item) {
    logger.error("CIS2 tokens not found in DynamoDB", {username})
    throw new Error("CIS2 tokens not found for user.")
  }

  logger.info("CIS2 tokens retrieved successfully from DynamoDB", {username})
  return {
    cis2AccessToken: result.Item.CIS2_accessToken,
    cis2IdToken: result.Item.CIS2_idToken
  }
}

// Fetch and verify CIS2 tokens
export const fetchAndVerifyCIS2Tokens = async (
  event: APIGatewayProxyEvent,
  documentClient: DynamoDBDocumentClient,
  logger: Logger
): Promise<{cis2AccessToken: string; cis2IdToken: string}> => {
  const tokenMappingTableName = process.env["TokenMappingTableName"]
  if (!tokenMappingTableName) {
    throw new Error("Token mapping table name is not set in environment variables.")
  }

  const username = getUsernameFromEvent(event)
  const tokens = await fetchCIS2TokensFromDynamoDB(username, tokenMappingTableName, documentClient, logger)

  await verifyIdToken(tokens.cis2IdToken, logger) // Verify ID token
  return tokens
}

// Verify the ID token using JWKS
export const verifyIdToken = async (idToken: string, logger: Logger): Promise<void> => {
  const oidcIssuer = process.env["oidcIssuer"]
  const oidcClientId = process.env["oidcClientId"]
  const jwksUri = process.env["oidcjwksEndpoint"]

  if (!oidcIssuer || !oidcClientId || !jwksUri) {
    throw new Error("OIDC configuration is incomplete in environment variables.")
  }

  const client = jwksClient({jwksUri, cache: true, cacheMaxAge: 3600000}) // Cache for 1 hour
  const decodedToken = jwt.decode(idToken, {complete: true}) as {header: {kid: string}} | null

  if (!decodedToken || !decodedToken.header.kid) {
    throw new Error("Token validation failed due to a missing or malformed header.")
  }

  const signingKey = await getSigningKey(client, decodedToken.header.kid)
  const verifiedToken = jwt.verify(idToken, signingKey, {
    issuer: oidcIssuer,
    audience: oidcClientId,
    clockTolerance: 5
  }) as JwtPayload

  if (!VALID_ACR_VALUES.includes(verifiedToken.acr || "")) {
    throw new Error("Invalid ACR claim in ID token.")
  }

  logger.info("ID token successfully verified.")
}
