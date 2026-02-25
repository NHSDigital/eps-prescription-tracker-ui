import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import axios, {isAxiosError} from "axios"
import {parse, ParsedUrlQuery, stringify} from "querystring"

import {PrivateKey} from "jsonwebtoken"

import {verifyIdToken, initializeOidcConfig} from "@cpt-ui-common/authFunctions"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {headers} from "@cpt-ui-common/lambdaUtils"

import {rewriteRequestBody} from "./helpers"
import {
  insertTokenMapping, 
  tryGetTokenMapping, 
  TokenMappingItem
} from "@cpt-ui-common/dynamoFunctions"

/*
This is the lambda code that is used to intercept calls to token endpoint as part of the cognito login flow
It expects the following environment variables to be set

TokenMappingTableName
jwtPrivateKeyArn
jwtKid

For CIS2 calls, the following must be set
CIS2_OIDC_ISSUER
CIS2_OIDC_CLIENT_ID
CIS2_OIDCJWKS_ENDPOINT
CIS2_USER_INFO_ENDPOINT
CIS2_USER_POOL_IDP
CIS2_IDP_TOKEN_PATH
FULL_CLOUDFRONT_DOMAIN

For mock calls, the following must be set
MOCK_OIDC_ISSUER
MOCK_OIDC_CLIENT_ID
MOCK_OIDCJWKS_ENDPOINT
MOCK_USER_INFO_ENDPOINT
MOCK_USER_POOL_IDP
MOCK_IDP_TOKEN_PATH
FULL_CLOUDFRONT_DOMAIN
*/

const logger = new Logger({serviceName: "token"})

const cloudfrontDomain = process.env["FULL_CLOUDFRONT_DOMAIN"] as string

// Create a config for cis2 and mock
// this is outside functions so it can be re-used and caching works
const {cis2OidcConfig} = initializeOidcConfig()

const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const jwtKid = process.env["jwtKid"] as string

const idpTokenPath = process.env["CIS2_IDP_TOKEN_PATH"] as string

// Set the redirect back to our proxy lambda
const idpCallbackPath = `https://${cloudfrontDomain}/oauth2/callback`

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const errorResponseBody = {
  message: "A system error has occurred"
}

const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

function checkIfValidTokenMapping(tokenMapping: TokenMappingItem | undefined): boolean {
  const fifteenMinutes = 15 * 60 * 1000

  return tokenMapping !== undefined &&
    tokenMapping.sessionId !== undefined &&
    tokenMapping.lastActivityTime !== undefined &&
    tokenMapping.lastActivityTime > Date.now() - fifteenMinutes
}

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({
    "apigw-request-id": event.requestContext?.requestId
  })
  const axiosInstance = axios.create()
  logger.debug("data from env variables", {
    cloudfrontDomain,
    tokenMappingTableName: cis2OidcConfig.tokenMappingTableName,
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

  let tokenResponse
  try {
    tokenResponse = await axiosInstance.post(idpTokenPath,
      stringify(rewrittenObjectBodyParameters)
    )
  } catch (e) {
    if (isAxiosError(e)) {
      if (e.response) {
        logger.error("error calling idp - response", {e, response: e.response})
      }
    }
    throw (e)
  }

  logger.debug("response from external oidc", {data: tokenResponse.data})

  const accessToken = tokenResponse.data.access_token
  const idToken = tokenResponse.data.id_token

  // verify and decode idToken
  const decodedIdToken = await verifyIdToken(idToken, logger)
  logger.debug("decoded idToken", {decodedIdToken})

  const username = `${cis2OidcConfig.userPoolIdp}_${decodedIdToken.sub}`
  if (!decodedIdToken.exp) {
    throw new Error("Can not get expiry time from decoded token")
  }

  const tokenMappingItem: TokenMappingItem = {
    username: username,
    sessionId: decodedIdToken.at_hash,
    cis2AccessToken: accessToken,
    cis2IdToken: idToken,
    cis2ExpiresIn: decodedIdToken.exp.toString(),
    currentlySelectedRole: decodedIdToken.selected_roleid,
    lastActivityTime: Date.now()
  }

  const existingTokenMapping = await tryGetTokenMapping(documentClient,
    cis2OidcConfig.tokenMappingTableName,
    username,
    logger
  )

  const sessionManagementTableName = cis2OidcConfig.sessionManagementTableName

  if (checkIfValidTokenMapping(existingTokenMapping)) {
    logger.info("User already exists in token mapping table, creating draft session",
      {username}, {sessionManagementTableName})
    await insertTokenMapping(documentClient, sessionManagementTableName, tokenMappingItem, logger)
  } else {
    logger.info("No user token already exists or last activity was more than 15 minutes ago", {tokenMappingItem})
    await insertTokenMapping(documentClient, cis2OidcConfig.tokenMappingTableName, tokenMappingItem, logger)
  }

  // return status code and body from request to downstream idp
  return {
    statusCode: tokenResponse.status,
    body: JSON.stringify(tokenResponse.data),
    headers: headers.formatHeaders(tokenResponse.headers)
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
