import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"

import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import axios from "axios"
import {parse} from "querystring"

import {PrivateKey} from "jsonwebtoken"

// TODO: will be needed for storing username in dynamoDB
// import {initializeOidcConfig} from "@cpt-ui-common/authFunctions"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

import {SessionStateItem} from "./types"
import {v4 as uuidv4} from "uuid"
import jwt from "jsonwebtoken"
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

const logger = new Logger({serviceName: "tokenMock"})

const cloudfrontDomain = process.env["FULL_CLOUDFRONT_DOMAIN"] as string

// Create a config for cis2 and mock
// this is outside functions so it can be re-used and caching works
// TODO: will be needed for storing username in dynamoDB
// const {mockOidcConfig} = initializeOidcConfig()

const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const jwtKid = process.env["jwtKid"] as string

const SessionStateMappingTableName = process.env["SessionStateMappingTableName"] as string
const apigeeApiKey = process.env["APIGEE_API_KEY"] as string
const apigeeApiSecret = process.env["APIGEE_API_SECRET"] as string

const idpTokenPath = process.env["MOCK_IDP_TOKEN_PATH"] as string

// Set the redirect back to our proxy lambda

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

  const body = event.body
  if (body === undefined) {
    throw new Error("can not get body")
  }
  const objectBodyParameters = parse(body as string)
  // TODO: investigate if these are needed at all
  //   const grant_type = objectBodyParameters.grant_type
  //   const client_id = objectBodyParameters.client_id
  //   const redirect_uri = objectBodyParameters.redirect_uri
  //   const client_secret = objectBodyParameters.client_secret
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
  logger.debug("apigee userinfo response", {
    response: {
      headers: userInfo.headers,
      data: userInfo.data,
      status: userInfo.status
    }
  })
  // then create an signed JWT for the id token
  // TODO: needs adding to dynamoDB
  //   const userName = `${mockOidcConfig.userPoolIdp}_${userInfo.data.sub}`
  const current_time = Math.floor(Date.now() / 1000)
  const expiration_time = current_time + 300
  const jwtClaims = {
    exp: expiration_time,
    iat: current_time,
    jti: uuidv4(),
    iss: "https://identity.ptl.api.platform.nhs.uk/realms/Cis2-mock-internal-dev",
    aud: "eps_cpt_ui_dev",
    sub: userInfo.data.sub,
    typ: "ID",
    azp: "eps_cpt_ui_dev",
    sessionState: sessionState,
    acr: "AAL3_ANY",
    sid: sessionState,
    id_assurance_level: "3",
    uid: userInfo.data.sub,
    amr: [
      "N3_SMARTCARD"
    ],
    name: userInfo.data.name,
    authentication_assurance_level: "3",
    given_name: userInfo.data.given_name,
    family_name: userInfo.data.family_name,
    email: userInfo.data.email
  }

  logger.debug("Claims", {jwtClaims})
  const signOptions: jwt.SignOptions = {
    algorithm: "RS512",
    keyid: jwtKid
  }
  const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
  const jwt_token = jwt.sign(jwtClaims, jwtPrivateKey as PrivateKey, signOptions)
  logger.debug("jwt_token", {jwt_token})

  // will have needed to set the jwks url for the mock coginito

  // then return some data that looks like this
  const responseData = {
    "access_token": access_token,
    "expires_in": 3600,
    "id_token": jwt_token,
    "not-before-policy": current_time,
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
