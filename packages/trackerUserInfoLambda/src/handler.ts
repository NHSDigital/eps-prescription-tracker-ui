import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb"
import {fetchAndVerifyCIS2Tokens, fetchUserInfo} from "./cis2_token_helpers"

const logger = new Logger({serviceName: "trackerUserInfo"})
const UserPoolIdentityProvider = process.env["UserPoolIdentityProvider"] as string
const idpTokenPath = process.env["idpTokenPath"] as string
const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const useSignedJWT = process.env["useSignedJWT"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const oidcClientId = process.env["oidcClientId"] as string
const oidcIssuer = process.env["oidcIssuer"] as string
const oidcUserInfoEndpoint = process.env["oidcUserInfoEndpoint"] as string

const dynamoClient = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  const httpMethod = event.httpMethod

  if (httpMethod === "GET") {
    logger.info("Handling a GET request")
    return {
      statusCode: 200,
      body: JSON.stringify({message: `Handling GET for Tracker User Info`})
    }
  }

  const body = event.body
  if (body === null || body === undefined) {
    logger.error("Request body is missing")
    throw new Error("Request body is missing")
  }

  try {
    const {accessToken, idToken, decodedIdToken} = await fetchAndVerifyCIS2Tokens({
      logger,
      body,
      useSignedJWT,
      jwtPrivateKeyArn,
      idpTokenPath,
      oidcIssuer,
      oidcClientId
    })

    const username = `${UserPoolIdentityProvider}_${decodedIdToken.sub}`
    const params = {
      Item: {
        username,
        accessToken,
        idToken,
        expiresIn: decodedIdToken.exp
      },
      TableName: TokenMappingTableName
    }

    logger.debug("Inserting into DynamoDB", {params})
    await documentClient.send(new PutCommand(params))

    // Make the UserInfo request here
    logger.info("Making UserInfo request")
    const userInfoResponse = await fetchUserInfo({
      logger,
      accessToken,
      decodedIdToken,
      oidcUserInfoEndpoint
    })

    logger.info("UserInfo response received", {userInfoResponse})

    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          message: "UserInfo fetched successfully",
          userInfo: userInfoResponse
        }
      )
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
