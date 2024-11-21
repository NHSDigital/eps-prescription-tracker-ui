import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent} from "aws-lambda"
import axios from "axios"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"

export const fetchAndVerifyCIS2Tokens = async (
  event: APIGatewayProxyEvent,
  documentClient: DynamoDBDocumentClient,
  logger: Logger
) => {

  logger.info("Fetching and verifying CIS2 tokens")

  const TokenMappingTableName = process.env["TokenMappingTableName"]
  if (!TokenMappingTableName) {
    throw new Error("Token mapping table name not set")
  }

  // Extract tokens from request headers
  const authorizationHeader = event.headers["Authorization"] || event.headers["authorization"]
  if (!authorizationHeader) {
    throw new Error("Authorization header missing")
  }

  // Extract the idToken from the Authorization header
  const idToken = authorizationHeader.replace("Bearer ", "").trim()

  // Decode the idToken, which is a JWT. We need the `cognito:username` claim to fetch the user data from DynamoDB
  const username = event.requestContext.authorizer?.claims["cognito:username"]
  if (!username){
    throw new Error("Unable to extract username from ID token")
  }
  logger.info("Extracted username from ID token", {username})

  // Fetch the relevant document from DynamoDB, containing the CIS2 tokens
  let cis2AccessToken
  let cis2IdToken
  let existingData
  try {
    logger.info("Fetching CIS2 access token from DynamoDB")
    const result = await documentClient.send(
      new GetCommand({
        TableName: TokenMappingTableName,
        Key: {username}
      })
    )
    logger.info("DynamoDB response", {result})

    if (result.Item) {
      existingData = result.Item
      cis2AccessToken = existingData.CIS2_accessToken
      cis2IdToken = existingData.CIS2_idToken
    } else {
      logger.error("CIS2 access token not found for user")
      throw new Error("CIS2 access token not found for user")
    }
  } catch (error) {
    logger.error("Error fetching data from DynamoDB", {error})
    throw new Error("Internal server error while accessing DynamoDB")
  }

  verifyIdToken(idToken)

  return {cis2AccessToken, cis2IdToken}
}

// TODO: Verify the token with CIS2
const verifyIdToken = async (idToken: string) => {
  const oidcIssuer = process.env["oidcIssuer"]
  if (!oidcIssuer) {
    throw new Error("OIDC issuer not set")
  }

  if (!idToken) {
    throw new Error("ID token not provided")
  }
}

export const fetchUserInfo = async (accessToken: string, logger: Logger) => {
  const oidcUserInfoEndpoint = process.env["oidcUserInfoEndpoint"]
  if (!oidcUserInfoEndpoint) {
    throw new Error("OIDC UserInfo endpoint not set")
  }
  logger.info("Fetching user info from OIDC UserInfo endpoint", {oidcUserInfoEndpoint})

  const response = await axios.get(oidcUserInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  return response.data
}
