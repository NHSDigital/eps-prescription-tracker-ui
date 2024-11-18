import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import axios from "axios"
import {parse, ParsedUrlQuery, stringify} from "querystring"

import {PrivateKey} from "jsonwebtoken"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb"
import {rewriteBodyToAddSignedJWT, verifyJWTWrapper} from "./helpers"

const logger = new Logger({serviceName: "trackerUserInfo"})
const UserPoolIdentityProvider = process.env["UserPoolIdentityProvider"] as string
const idpTokenPath = process.env["idpTokenPath"] as string
const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const useSignedJWT = process.env["useSignedJWT"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const oidcClientId = process.env["oidcClientId"] as string
const oidcIssuer = process.env["oidcIssuer"] as string

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})
  logger.info("Lambda handler invoked", {event})

  const axiosInstance = axios.create()
  const httpMethod = event.httpMethod

  if (httpMethod === "GET") {
    logger.info("Handling a GET request")
    return {
      statusCode: 200,
      body: JSON.stringify({message: `Handling GET for Tracker User Info`})
    }
  }

  const body = event.body
  if (body === undefined) {
    logger.error("Request body is missing")
    throw new Error("Request body is missing")
  }

  const objectBodyParameters = parse(body as string)
  logger.debug("Parsed request body parameters", {objectBodyParameters})

  let rewrittenObjectBodyParameters: ParsedUrlQuery

  if (useSignedJWT === "true") {
    try {
      logger.info("Fetching JWT private key")
      const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
      rewrittenObjectBodyParameters = rewriteBodyToAddSignedJWT(
        logger, objectBodyParameters, idpTokenPath, jwtPrivateKey as PrivateKey
      )
      logger.debug("Rewritten body with signed JWT", {rewrittenObjectBodyParameters})
    } catch (error) {
      logger.error("Error fetching or processing JWT private key", {error})
      throw error
    }
  } else {
    rewrittenObjectBodyParameters = objectBodyParameters
    logger.info("JWT signing is not enabled, using original body parameters")
  }

  logger.debug("Calling downstream IDP with rewritten body", {idpTokenPath, body: rewrittenObjectBodyParameters})

  try {
    const tokenResponse = await axiosInstance.post(idpTokenPath, stringify(rewrittenObjectBodyParameters))
    logger.debug("Response from external OIDC", {data: tokenResponse.data})

    const accessToken = tokenResponse.data.access_token
    const idToken = tokenResponse.data.id_token

    // Ensure tokens exist before proceeding
    if (!accessToken || !idToken) {
      logger.error("Failed to retrieve tokens from OIDC response")
      throw new Error("Failed to retrieve tokens from OIDC response")
    }

    // Verify and decode idToken
    logger.info("Verifying and decoding ID token")
    const decodedIdToken = await verifyJWTWrapper(idToken, oidcIssuer, oidcClientId)
    logger.debug("Decoded idToken", {decodedIdToken})

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

    return {
      statusCode: 200,
      body: "OK"
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
