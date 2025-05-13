import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import axios from "axios"
import {parse, stringify} from "querystring"
import {PrivateKey} from "jsonwebtoken"
import {initializeOidcConfig} from "@cpt-ui-common/authFunctions"
import {updateApigeeAccessToken, extractRoleInformation} from "@cpt-ui-common/dynamoFunctions"
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
const {mockOidcConfig} = initializeOidcConfig()

// Environment variables

const cloudfrontDomain= process.env["FULL_CLOUDFRONT_DOMAIN"] as string
const tokenMappingTable= process.env["TokenMappingTableName"] as string
const jwtPrivateKeyArn= process.env["jwtPrivateKeyArn"] as string
const jwtKid= process.env["jwtKid"] as string
const SessionStateMappingTableName = process.env["SessionStateMappingTableName"] as string
const apigeeApiKey= process.env["APIGEE_API_KEY"] as string
const apigeeApiSecret= process.env["APIGEE_API_SECRET"] as string
const idpTokenPath= process.env["MOCK_IDP_TOKEN_PATH"] as string

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true
  }})
const axiosInstance = axios.create()

const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

async function getSessionState(code: string): Promise<SessionStateItem> {
  logger.debug("Retrieving session state", {code})
  const result = await documentClient.send(
    new GetCommand({
      TableName: SessionStateMappingTableName,
      Key: {LocalCode: code}
    })
  )
  if (!result.Item) throw new Error("State not found in DynamoDB")
  return result.Item as SessionStateItem
}

async function exchangeApigeeCode(apigeeCode: string, callbackUri: string) {
  const params = {
    grant_type: "authorization_code",
    client_id: apigeeApiKey,
    client_secret: apigeeApiSecret,
    redirect_uri: callbackUri,
    code: apigeeCode
  }

  try {
    const response = await axiosInstance.post(
      mockOidcConfig.oidcTokenEndpoint,
      stringify(params),
      {headers: {"Content-Type": "application/x-www-form-urlencoded"}}
    )
    return response.data
  } catch (error) {
    logger.error("Token exchange failed", {error: axios.isAxiosError(error) ? error.response?.data : error})
    throw error
  }
}

async function getUserInfo(accessToken: string) {
  const response = await axiosInstance.get(mockOidcConfig.oidcUserInfoEndpoint, {
    headers: {"Authorization": `Bearer ${accessToken}`}
  })
  return response.data
}

async function createSignedJwt(claims: Record<string, unknown>) {
  const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
  return jwt.sign(claims, jwtPrivateKey as PrivateKey, {
    algorithm: "RS512",
    keyid: jwtKid
  })
}

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})

  logger.debug("data from env variables", {
    cloudfrontDomain,
    tokenMappingTable,
    jwtPrivateKeyArn,
    jwtKid,
    SessionStateMappingTableName,
    idpTokenPath
  })

  const {code} = parse(event.body || "")
  if (!code) throw new Error("Code parameter is missing")

  const sessionState = await getSessionState(code as string)
  const callbackUri = `https://${cloudfrontDomain}/oauth2/mock-callback`
  const tokenResponse = await exchangeApigeeCode(sessionState.ApigeeCode, callbackUri)
  logger.debug("Token response", {tokenResponse})

  const userInfo = await getUserInfo(tokenResponse.access_token)
  logger.debug("received user info", {userInfo})
  const current_time = Math.floor(Date.now() / 1000)
  const expirationTime = current_time + parseInt(tokenResponse.expires_in)
  const username = `${mockOidcConfig.userPoolIdp}_${userInfo.sub}`

  const roleDetails = extractRoleInformation(
    userInfo,
    userInfo.uid,
    logger
  )

  const jwtClaims = {
    exp: expirationTime,
    iat: current_time,
    jti: uuidv4(),
    iss: mockOidcConfig.oidcIssuer,
    aud: mockOidcConfig.oidcClientID,
    sub: userInfo.sub,
    typ: "ID",
    azp: mockOidcConfig.oidcClientID,
    sessionState: sessionState.SessionState,
    acr: "AAL3_ANY",
    sid: sessionState.SessionState,
    id_assurance_level: "3",
    uid: userInfo.sub,
    amr: ["N3_SMARTCARD"],
    name: userInfo.name,
    authentication_assurance_level: "3",
    given_name: roleDetails.user_details.given_name,
    family_name: roleDetails.user_details.given_name,
    email: userInfo.email,
    selected_roleid: userInfo.uid
  }

  const jwtToken = await createSignedJwt(jwtClaims)

  await updateApigeeAccessToken(
    documentClient,
    tokenMappingTable,
    {
      username,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: expirationTime,
      selectedRoleId: roleDetails.currently_selected_role,
      userDetails: roleDetails.user_details,
      rolesWithAccess: roleDetails.roles_with_access,
      rolesWithoutAccess: roleDetails.roles_without_access
    },
    logger
  )

  return {
    statusCode: 200,
    body: JSON.stringify({
      access_token: tokenResponse.access_token,
      expires_in: tokenResponse.expires_in,
      id_token: jwtToken,
      "not-before-policy": current_time,
      refresh_expires_in: tokenResponse.refresh_token_expires_in,
      refresh_token: tokenResponse.refresh_token,
      scope: "openid associatedorgs profile nationalrbacaccess nhsperson email",
      session_state: sessionState.SessionState,
      token_type: tokenResponse.token_type,
      sid: tokenResponse.sid
    })
  }
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(inputOutputLogger({logger: (request) => logger.info(request)}))
  .use(middyErrorHandler.errorHandler({logger}))
