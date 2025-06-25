import {MiddlewareObj} from "@middy/core"
import {APIGatewayProxyEventBase, APIGatewayProxyResult} from "aws-lambda"
import {getUsernameFromEvent} from "./event"
import {authenticateRequest, AuthenticateRequestOptions, AuthResult} from "./authenticateRequest"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {Logger} from "@aws-lambda-powertools/logger"
import {AxiosInstance} from "axios"

export const authenticationMiddleware = (
  axiosInstance: AxiosInstance,
  ddbClient: DynamoDBDocumentClient,
  authOptions: AuthenticateRequestOptions,
  logger: Logger
) => ({
  before: async (request) => {
    const {event} = request
    const username = getUsernameFromEvent(event)

    const authResult = await authenticateRequest(username, axiosInstance, ddbClient, logger, authOptions)
    if (!authResult) {
      request.earlyResponse = {
        statusCode: 401,
        body: JSON.stringify({
          message: "Session expired or invalid. Please log in again.",
          restartLogin: true
        })
      }
      return request.earlyResponse
    }
    event.requestContext.authorizer = authResult
  }
} satisfies MiddlewareObj<APIGatewayProxyEventBase<AuthResult>, APIGatewayProxyResult, Error>)
