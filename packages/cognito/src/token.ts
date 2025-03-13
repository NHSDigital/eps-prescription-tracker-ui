import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import axios from "axios"
import {parse, ParsedUrlQuery, stringify} from "querystring"

import {PrivateKey} from "jsonwebtoken"

import {verifyIdToken, initializeOidcConfig} from "@cpt-ui-common/authFunctions"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import {formatHeaders, rewriteRequestBody} from "./helpers"
import {SessionStateItem} from "./types"

/*
This is the lambda code that is used to intercept calls to token endpoint as part of the cognito login flow
It expects the following environment variables to be set

TokenMappingTableName
jwtPrivateKeyArn
jwtKid
useMock

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
const useMock: boolean = process.env["useMock"] === "true"

const cloudfrontDomain = process.env["FULL_CLOUDFRONT_DOMAIN"] as string

// Create a config for cis2 and mock
// this is outside functions so it can be re-used and caching works
const {mockOidcConfig, cis2OidcConfig} = initializeOidcConfig()

const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const jwtKid = process.env["jwtKid"] as string

const SessionStateMappingTableName = process.env["SessionStateMappingTableName"] as string
const apigeeApiKey = process.env["APIGEE_API_KEY"] as string
const apigeeApiSecret = process.env["APIGEE_API_SECRET"] as string

const idpTokenPath = useMock ?
  process.env["MOCK_IDP_TOKEN_PATH"] as string :
  process.env["CIS2_IDP_TOKEN_PATH"] as string

// Set the redirect back to our proxy lambda
const idpCallbackPath = `https://${cloudfrontDomain}/oauth2/callback`

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
    cloudfrontDomain,
    TokenMappingTableName,
    jwtPrivateKeyArn,
    jwtKid,
    SessionStateMappingTableName,
    idpTokenPath
  })
  if (useMock) {
    // need to get the code from the session state table

    const body = event.body
    if (body === undefined) {
      throw new Error("can not get body")
    }
    const objectBodyParameters = parse(body as string)
    const grant_type = objectBodyParameters.grant_type
    const client_id = objectBodyParameters.client_id
    const redirect_uri = objectBodyParameters.redirect_uri
    const client_secret = objectBodyParameters.client_secret
    const code = objectBodyParameters.code

    logger.debug("trying to get data from session state mapping table", {
      SessionStateMappingTableName,
      code
    })
    // Get the original Cognito state from DynamoDB
    const getResult = await documentClient.send(
      new GetCommand({
        TableName: SessionStateMappingTableName,
        Key: {LocalCode: code}
      })
    )

    if (!getResult.Item) {
      logger.error("Failed to get state from table", {SessionStateMappingTableName})
      throw new Error("State not found in DynamoDB")
    }

    const sessionStateItem = getResult.Item as SessionStateItem
    const apigeeCode = sessionStateItem.ApigeeCode
    const sessionState = sessionStateItem.SessionState
    const callbackUri = `https://${cloudfrontDomain}/oauth2/mock-callback`

    // then call the apim token exchange endpoint to get token from code
    const apigeeTokenExchangeUrl = "https://internal-dev.api.service.nhs.uk/oauth2-mock/token"
    const tokenExchangeParams = {
      "grant_type": "authorization_code",
      "client_id": apigeeApiKey,
      "client_secret": apigeeApiSecret,
      "redirect_uri": callbackUri,
      code: apigeeCode
    }
    logger.debug("going to call apigee token exchange", {
      apigeeTokenExchangeUrl,
      tokenExchangeParams
    })
    const tokenResponse = await axiosInstance.post(apigeeTokenExchangeUrl,
      tokenExchangeParams,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    )
    logger.debug("apigee token response", {data: tokenResponse.data})
    const access_token = tokenResponse.data.access_token
    const refresh_token = tokenResponse.data.refresh_token

    // then call userinfo endpoint to get username
    const apigeeUserInfoUrl = "https://internal-dev.api.service.nhs.uk/oauth2-mock/userinfo"

    logger.debug("going to call apigee user info", {
      apigeeUserInfoUrl
    })
    const userInfo = await axiosInstance.get(apigeeUserInfoUrl, {headers: {
      "Authorization": `Bearer ${access_token}`
    }})
    logger.debug("apigee userinfo response", {userInfo})
    // then create an signed JWT for the id token

    // will have needed to set the jwks url for the mock coginito

    // then return some data that looks like this
    const responseData = {
      "access_token": access_token,
      "expires_in": 3600,
      "id_token": "NEED TO CREATE THIS",
      "not-before-policy": 1735638487,
      "refresh_expires_in": 1800,
      "refresh_token": refresh_token,
      "scope": "openid associatedorgs profile nationalrbacaccess nhsperson email",
      "session_state": sessionState,
      "token_type": "Bearer"
    }
    return {
      statusCode: 200,
      body: JSON.stringify(responseData)
    }
  }

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
