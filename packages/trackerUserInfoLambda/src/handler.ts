import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {fetchAndVerifyCIS2Tokens, fetchUserInfo} from "./cis2_token_helpers"

const logger = new Logger({serviceName: "trackerUserInfo"})

const dynamoClient = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const CPT_ACCESS_ACTIVITY_CODES = ["B0570", "B0278"]

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  try {
    // Fetch and verify CIS2 tokens
    const {cis2AccessToken, cis2IdToken} = await fetchAndVerifyCIS2Tokens(event, documentClient, logger)
    logger.info("CIS2 tokens fetched and verified", {cis2AccessToken, cis2IdToken})

    logger.info("Making UserInfo request")
    const userInfoResponse = await fetchUserInfo(cis2AccessToken, CPT_ACCESS_ACTIVITY_CODES, undefined, logger)

    logger.info("UserInfo response received", {userInfoResponse})

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "UserInfo fetched successfully",
        userInfo: userInfoResponse
      })
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Error occurred in Lambda handler", {error: error.message})
    } else {
      logger.error("Unknown error occurred in Lambda handler", {error: String(error)})
    }
    return {
      statusCode: 500,
      body: JSON.stringify({message: "Internal server error"})
    }
  }
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(middyErrorHandler.errorHandler({logger: logger}))
