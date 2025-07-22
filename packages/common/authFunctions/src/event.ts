import {APIGatewayProxyEvent} from "aws-lambda"

/**
 * Helper function to extract the username from a lambda invocation
 * @param event - the lambda event
 * @returns the username used in cognito auth
 * @throws error if can not extract username
 */
export const getUsernameFromEvent = (event: APIGatewayProxyEvent): string => {
  const username = event.requestContext.authorizer?.claims["cognito:username"]
  if (!username) {
    throw new Error("Unable to extract username from ID token")
  }
  return username
}

export const getSessionIdFromEvent = (event: APIGatewayProxyEvent): string => {
  const sessionId = event.requestContext.authorizer?.claims["custom:session_id"]
  if (!sessionId) {
    throw new Error("Unable to extract sessionId from ID token")
  }
  return sessionId
}
