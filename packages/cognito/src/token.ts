import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import inputOutputLogger from "@middy/input-output-logger"
import errorHandler from "@nhs/fhir-middy-error-handler"
import axios, {AxiosResponseHeaders, RawAxiosResponseHeaders} from "axios"
import {parse, stringify} from "querystring"
import jwksClient from "jwks-rsa"
import {
  verify,
  JwtHeader,
  SigningKeyCallback,
  JwtPayload
} from "jsonwebtoken"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb"

const logger = new Logger({serviceName: "token"})
const UserPoolIdentityProvider = process.env["UserPoolIdentityProvider"] as string
const TokenMappingTableName = process.env["TokenMappingTableName"] as string

const oidcJwksClient = jwksClient({
  jwksUri: process.env["oidcjwksEndpoint"] as string
})

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

/* eslint-disable  max-len */

/**
 *
 * adapted from https://github.com/aws-samples/cognito-external-idp-proxy/blob/main/lambda/token/token_flow.py
 *
 */

function getJWKSKey(header: JwtHeader, callback: SigningKeyCallback) {
  oidcJwksClient.getSigningKey(header.kid, function(err, key) {
    const signingKey = key?.getPublicKey()
    callback(err, signingKey)
  })
}

function verifyJWTWrapper(jwt: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    verify(jwt, getJWKSKey, function(err, decoded) {
      if (err) {
        reject(err)
      }
      resolve(decoded as JwtPayload)
    })
  })
}

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext.requestId
  })
  const idpTokenPath = process.env["idpTokenPath"] as string
  const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
  const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
  logger.info("retrieved secret key", {jwtPrivateKey})
  const body = event.body
  if (body===null) {
    throw new Error("can not get body")
  }
  const object_body = parse(body)

  // TODO create a signed JWT and add it to the request

  const axiosInstance = axios.create()

  logger.info("about to call downstream idp with rewritten body", {idpTokenPath, body: object_body})

  const response = await axiosInstance.post(idpTokenPath,
    stringify(object_body)
  )

  // TODO we should store the response so we can use the tokens returned by CIS2 in an apigee token exchange
  logger.info("response from external oidc", {data: response.data})

  const accessToken = response.data.access_token
  const idToken = response.data.id_token
  const expiresIn = response.data.expires_in

  // verify and decode idToken
  const decodedIdToken = await verifyJWTWrapper(idToken)
  logger.info("decoded idToken", {decodedIdToken})

  const username = `${UserPoolIdentityProvider}_${decodedIdToken.sub}`
  const params = {
    Item: {
      "Username": username,
      "accessToken": accessToken,
      "idToken": idToken,
      "expiresIn": expiresIn
    },
    TableName: TokenMappingTableName
  }

  logger.info("going to insert into dynamodb", {params})
  await documentClient.send(new PutCommand(params))

  // return status code and body from request to downstream idp
  return {
    statusCode: response.status,
    body: JSON.stringify(response.data),
    headers: formatHeaders(response.headers)
  }
}

const formatHeaders = (headers: AxiosResponseHeaders | Partial<RawAxiosResponseHeaders>): { [header: string]: string } => {
  const formattedHeaders: { [header: string]: string } = {}

  // Iterate through the Axios headers and ensure values are stringified
  for (const [key, value] of Object.entries(headers)) {
    formattedHeaders[key] = String(value) // Ensure each value is converted to string
  }

  return formattedHeaders
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
