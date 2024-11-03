import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import inputOutputLogger from "@middy/input-output-logger"
import errorHandler from "@nhs/fhir-middy-error-handler"
import axios from "axios"
import {parse, ParsedUrlQuery, stringify} from "querystring"

import {PrivateKey} from "jsonwebtoken"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb"
import {formatHeaders, rewriteBodyToAddSignedJWT, verifyJWTWrapper} from "./helpers"

const logger = new Logger({serviceName: "token"})
const UserPoolIdentityProvider = process.env["UserPoolIdentityProvider"] as string
const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const useSignedJWT = process.env["useSignedJWT"] as string
const idpTokenPath = process.env["idpTokenPath"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const oidcClientId = process.env["oidcClientId"] as string
const oidcIssuer = process.env["oidcIssuer"] as string

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

/* eslint-disable  max-len */

/**
 *
 * adapted from https://github.com/aws-samples/cognito-external-idp-proxy/blob/main/lambda/token/token_flow.py
 *
 */

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext.requestId
  })
  const axiosInstance = axios.create()
  const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)

  const body = event.body
  if (body===null) {
    throw new Error("can not get body")
  }
  const objectBodyParameters = parse(body)
  let rewrittenObjectBodyParameters: ParsedUrlQuery

  if (useSignedJWT === "true") {
    rewrittenObjectBodyParameters = rewriteBodyToAddSignedJWT(logger, objectBodyParameters, idpTokenPath, jwtPrivateKey as PrivateKey)
  } else {
    rewrittenObjectBodyParameters = objectBodyParameters
  }

  logger.info("about to call downstream idp with rewritten body", {idpTokenPath, body: rewrittenObjectBodyParameters})

  const tokenResponse = await axiosInstance.post(idpTokenPath,
    stringify(rewrittenObjectBodyParameters)
  )

  logger.info("response from external oidc", {data: tokenResponse.data})

  const accessToken = tokenResponse.data.access_token
  const idToken = tokenResponse.data.id_token
  const expiresIn = tokenResponse.data.expires_in
  const refreshToken = tokenResponse.data.refresh_token

  // verify and decode idToken
  const decodedIdToken = await verifyJWTWrapper(idToken, oidcIssuer, oidcClientId)
  logger.info("decoded idToken", {decodedIdToken})

  const username = `${UserPoolIdentityProvider}_${decodedIdToken.sub}`
  const params = {
    Item: {
      "username": username,
      "accessToken": accessToken,
      "idToken": idToken,
      "expiresIn": expiresIn,
      "refreshToken": refreshToken
    },
    TableName: TokenMappingTableName
  }

  logger.info("going to insert into dynamodb", {params})
  await documentClient.send(new PutCommand(params))

  // return status code and body from request to downstream idp
  return {
    statusCode: tokenResponse.status,
    body: JSON.stringify(tokenResponse.data),
    headers: formatHeaders(tokenResponse.headers)
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
  .use(errorHandler({logger: logger}))
