import {APIGatewayProxyEvent} from "aws-lambda"

export const getUsernameFromEvent = (event: APIGatewayProxyEvent): string => {
  const username = event.requestContext.authorizer?.claims["cognito:username"]
  if (!username) {
    throw new Error("Unable to extract username from ID token")
  }
  return username
}
