import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import axios from "axios"
import {parse, ParsedUrlQuery, stringify} from "querystring"

import {PrivateKey} from "jsonwebtoken"

import {verifyIdToken, initializeOidcConfig} from "@cpt-ui-common/authFunctions"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import {formatHeaders, rewriteRequestBody} from "./helpers"
/*
This is the lambda code that is used to intercept calls to token endpoint as part of the cognito login flow
It expects the following environment variables to be set

TokenMappingTableName
jwtPrivateKeyArn
jwtKid
COGNITO_DOMAIN

CIS2_OIDC_ISSUER
CIS2_OIDC_CLIENT_ID
CIS2_OIDCJWKS_ENDPOINT
CIS2_USER_INFO_ENDPOINT
CIS2_USER_POOL_IDP
CIS2_IDP_TOKEN_PATH
*/

const logger = new Logger({serviceName: "token"})

const cognitoDomain = process.env["COGNITO_DOMAIN"] as string

// Create a config for cis2 and mock
// this is outside functions so it can be re-used and caching works
const {cis2OidcConfig} = initializeOidcConfig()

const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const jwtKid = process.env["jwtKid"] as string

const idpTokenPath = process.env["CIS2_IDP_TOKEN_PATH"] as string

// Set the redirect back to our proxy lambda
const idpCallbackPath = `https://${cognitoDomain}/oauth2/idpresponse`

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })
  const axiosInstance = axios.create()
  logger.debug("data from env variables", {
    cognitoDomain,
    TokenMappingTableName,
    jwtPrivateKeyArn,
    jwtKid,
    idpTokenPath
  })

  const body = event.body
  if (body === undefined) {
    throw new Error("can not get body")
  }
  const objectBodyParameters = parse(body as string)
  let rewrittenObjectBodyParameters: ParsedUrlQuery

  const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
  rewrittenObjectBodyParameters = rewriteRequestBody(
    logger,
    objectBodyParameters,
    idpTokenPath,
    idpCallbackPath,
    jwtPrivateKey as PrivateKey,
    jwtKid
  )

  logger.debug("about to call downstream idp with rewritten body", {idpTokenPath, body: rewrittenObjectBodyParameters})

  const tokenResponse = await axiosInstance.post(idpTokenPath,
    stringify(rewrittenObjectBodyParameters)
  )

  logger.debug("response from external oidc", {data: tokenResponse.data})

  const accessToken = tokenResponse.data.access_token
  const idToken = tokenResponse.data.id_token

  // verify and decode idToken
  const decodedIdToken = await verifyIdToken(idToken, logger, cis2OidcConfig)
  logger.debug("decoded idToken", {decodedIdToken})

  const username = `${cis2OidcConfig.userPoolIdp}_${decodedIdToken.sub}`
  const params = {
    Item: {
      "username": username,
      "CIS2_accessToken": accessToken,
      "CIS2_idToken": idToken,
      "CIS2_expiresIn": decodedIdToken.exp,
      "selectedRoleId": decodedIdToken.selected_roleid
    },
    TableName: TokenMappingTableName
  }

  logger.debug("going to insert into dynamodb", {params})
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
  .use(middyErrorHandler.errorHandler({logger: logger}))
