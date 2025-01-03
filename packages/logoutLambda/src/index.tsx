import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { Logger } from "@aws-lambda-powertools/logger"
import { injectLambdaContext } from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import { MiddyErrorHandler } from "@cpt-ui-common/middyErrorHandler"

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb"

const logger = new Logger({ serviceName: "logout" })

const TokenMappingTableName = process.env["TokenMappingTableName"] as string

// Initialize DynamoDB clients
const dynamoClient = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

/**
 * The core Lambda handler (logoutHandler):
 *   Parses the username from the request.
 *   Deletes the record in DynamoDB where the partition key is 'username'.
 */
const logoutHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })

  if (!event.body) {
    throw new Error("Missing request body")
  }

  // Parse username from the request (user will have to be authorized to reach this point)
  const username = event.requestContext.authorizer?.claims["cognito:username"]
  if (!username) {
    throw new Error("username is required in the request body")
  }

  logger.debug("Attempting to delete user token record", { username })

  // Build and send DeleteCommand
  await documentClient.send(
    new DeleteCommand({
      TableName: TokenMappingTableName,
      Key: {
        username
      }
    })
  )

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Token record for user '${username}' has been deleted.`,
    }),
  }
}

export const handler = middy(logoutHandler)
  .use(injectLambdaContext(logger, { clearState: true }))
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(middyErrorHandler.errorHandler({ logger }))
