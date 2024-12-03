import {Logger} from "@aws-lambda-powertools/logger"
import {APIGatewayProxyEvent} from "aws-lambda"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"

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

// Retrieve CIS2 tokens by extracting the username and fetching from DynamoDB
export const fetchCIS2Tokens = async (
  event: APIGatewayProxyEvent,
  documentClient: DynamoDBDocumentClient,
  logger: Logger
): Promise<{cis2AccessToken: string; cis2IdToken: string}> => {
  const tokenMappingTableName = process.env["TokenMappingTableName"]
  if (!tokenMappingTableName) {
    throw new Error("Token mapping table name is not set in environment variables.")
  }

  const username = getUsernameFromEvent(event)
  return await fetchCIS2TokensFromDynamoDB(username, tokenMappingTableName, documentClient, logger)
}
