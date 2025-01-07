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
import jwksClient from "jwks-rsa"

import {formatHeaders, rewriteBodyToAddSignedJWT} from "./helpers"
import {verifyIdToken, OidcConfig} from "@cpt-ui-common/authFunctions"

const logger = new Logger({serviceName: "token"})
const useMock: boolean = process.env["useMock"] === "true"
// Create a JWKS client for cis2 and mock
// this is outside functions so it can be re-used
const cis2JwksUri = process.env["REAL_OIDCJWKS_ENDPOINT"] as string
const cis2JwksClient = jwksClient({
  jwksUri: cis2JwksUri,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 3600000 // 1 hour
})

const cis2OidcConfig: OidcConfig = {
  oidcIssuer: process.env["REAL_OIDC_ISSUER"] ?? "",
  oidcClientID: process.env["REAL_OIDC_CLIENT_ID"] ?? "",
  oidcJwksEndpoint: process.env["REAL_OIDCJWKS_ENDPOINT"] ?? "",
  oidcUserInfoEndpoint: process.env["REAL_USER_INFO_ENDPOINT"] ?? "",
  userPoolIdp: process.env["REAL_USER_POOL_IDP"] ?? "",
  jwksClient: cis2JwksClient,
  tokenMappingTableName: process.env["TokenMappingTableName"] ?? ""
}

const mockJwksUri = process.env["MOCK_OIDCJWKS_ENDPOINT"] as string
const mockJwksClient = jwksClient({
  jwksUri: mockJwksUri,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 3600000 // 1 hour
})

const mockOidcConfig: OidcConfig = {
  oidcIssuer: process.env["MOCK_OIDC_ISSUER"] ?? "",
  oidcClientID: process.env["MOCK_OIDC_CLIENT_ID"] ?? "",
  oidcJwksEndpoint: process.env["MOCK_OIDCJWKS_ENDPOINT"] ?? "",
  oidcUserInfoEndpoint: process.env["MOCK_USER_INFO_ENDPOINT"] ?? "",
  userPoolIdp: process.env["MOCK_USER_POOL_IDP"] ?? "",
  jwksClient: mockJwksClient,
  tokenMappingTableName: process.env["TokenMappingTableName"] ?? ""
}

const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const jwtKid = process.env["jwtKid"] as string

const idpTokenPath = useMock ?
  process.env["MOCK_IDP_TOKEN_PATH"] as string :
  process.env["REAL_IDP_TOKEN_PATH"] as string

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

  const body = event.body
  if (body === undefined) {
    throw new Error("can not get body")
  }
  const objectBodyParameters = parse(body as string)
  let rewrittenObjectBodyParameters: ParsedUrlQuery

  const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
  rewrittenObjectBodyParameters = rewriteBodyToAddSignedJWT(
    logger, objectBodyParameters, idpTokenPath, jwtPrivateKey as PrivateKey, jwtKid)

  logger.debug("about to call downstream idp with rewritten body", {idpTokenPath, body: rewrittenObjectBodyParameters})

  const tokenResponse = await axiosInstance.post(idpTokenPath,
    stringify(rewrittenObjectBodyParameters)
  )

  logger.debug("response from external oidc", {data: tokenResponse.data})

  const accessToken = tokenResponse.data.access_token
  const idToken = tokenResponse.data.id_token

  // verify and decode idToken
  const decodedIdToken = await verifyIdToken(idToken, logger, useMock ? mockOidcConfig : cis2OidcConfig)
  logger.debug("decoded idToken", {decodedIdToken})

  const username = useMock ?
    `${mockOidcConfig.userPoolIdp}_${decodedIdToken.sub}` :
    `${cis2OidcConfig.userPoolIdp}_${decodedIdToken.sub}`
  const params = {
    Item: {
      "username": username,
      "CIS2_accessToken": accessToken,
      "CIS2_idToken": idToken,
      "CIS2_expiresIn": decodedIdToken.exp
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
