import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import {parse} from "querystring"
import {PrivateKey} from "jsonwebtoken"
import {exchangeTokenForApigeeAccessToken, fetchUserInfo, initializeOidcConfig} from "@cpt-ui-common/authFunctions"
import {insertTokenMapping, tryGetTokenMapping, TokenMappingItem} from "@cpt-ui-common/dynamoFunctions"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import jwt from "jsonwebtoken"
import axios from "axios"

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
const jwtPrivateKeyArn= process.env["jwtPrivateKeyArn"] as string
const jwtKid= process.env["jwtKid"] as string
const idpTokenPath= process.env["MOCK_IDP_TOKEN_PATH"] as string
const apigeeApiKeyArn = process.env["APIGEE_API_KEY_ARN"] as string
const apigeeApiSecretArn = process.env["APIGEE_API_SECRET_ARN"] as string
const apigeeMockTokenEndpoint = process.env["MOCK_OIDC_TOKEN_ENDPOINT"] as string

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true
  }})

const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)
const axiosInstance = axios.create()

async function createSignedJwt(claims: Record<string, unknown>) {
  const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
  return jwt.sign(claims, jwtPrivateKey as PrivateKey, {
    algorithm: "RS512",
    keyid: jwtKid
  })
}

function checkIfValidTokenMapping(tokenMapping: TokenMappingItem | undefined): boolean {
  const fifteenMinutes = 15 * 60 * 1000

  return tokenMapping !== undefined &&
    tokenMapping.sessionId !== undefined &&
    tokenMapping.apigeeAccessToken !== undefined &&
    tokenMapping.apigeeExpiresIn !== undefined &&
    tokenMapping.lastActivityTime !== undefined &&
    tokenMapping.lastActivityTime > Date.now() - fifteenMinutes
}

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const apigeeApiKey = await getSecret(apigeeApiKeyArn)
  const apigeeApiSecret = await getSecret(apigeeApiSecretArn)
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})

  // we need to use the base domain for the environment so that pull requests go to that callback uri
  // as we can only have one callback uri per apigee application
  const baseEnvironmentDomain = cloudfrontDomain.replace(/-pr-(\d*)/, "")
  logger.debug("data from env variables", {
    cloudfrontDomain,
    baseEnvironmentDomain,
    tokenMappingTable: mockOidcConfig.tokenMappingTableName,
    jwtPrivateKeyArn,
    jwtKid,
    idpTokenPath
  })

  const {code, session_state} = parse(event.body || "")
  if (!code) throw new Error("Code parameter is missing")

  const callbackUri = `https://${baseEnvironmentDomain}/oauth2/mock-callback`
  const tokenExchangeBody = {
    grant_type: "authorization_code",
    client_id: apigeeApiKey?.toString(),
    client_secret: apigeeApiSecret?.toString(),
    redirect_uri: callbackUri,
    code
  }
  const exchangeResult = await exchangeTokenForApigeeAccessToken(
    axiosInstance,
    apigeeMockTokenEndpoint,
    tokenExchangeBody,
    logger
  )

  const userInfoResponse = await fetchUserInfo(
    "",
    "",
    exchangeResult.accessToken,
    true,
    logger,
    mockOidcConfig
  )

  const current_time = Math.floor(Date.now() / 1000)
  const expirationTime = current_time + 600
  const baseUsername = userInfoResponse.user_details.sub
  const sessionId = crypto.randomUUID()

  const jwtClaims = {
    exp: expirationTime,
    iat: current_time,
    jti: sessionId,
    iss: mockOidcConfig.oidcIssuer,
    aud: mockOidcConfig.oidcClientID,
    sub: userInfoResponse.user_details.sub,
    typ: "ID",
    azp: mockOidcConfig.oidcClientID,
    sessionState: session_state || "",
    acr: "AAL3_ANY",
    sid: session_state || "",
    id_assurance_level: "3",
    uid: userInfoResponse.user_details.sub,
    amr: ["N3_SMARTCARD"],
    name: userInfoResponse.user_details.name,
    authentication_assurance_level: "3",
    given_name: userInfoResponse.user_details.given_name,
    family_name: userInfoResponse.user_details.family_name,
    session_id: sessionId
  }

  const jwtToken = await createSignedJwt(jwtClaims)

  // as we now have all the user information including roles, and apigee tokens
  // store them in the token mapping table
  const existingTokenMapping = await tryGetTokenMapping(documentClient,
    mockOidcConfig.tokenMappingTableName,
    `Mock_${baseUsername}`,
    logger
  )
  logger.info("Existing token mapping for user", {existingTokenMapping})

  let tokenMappingItem: TokenMappingItem = {
    username: `Mock_${baseUsername}`,
    sessionId: sessionId,
    apigeeAccessToken: exchangeResult.accessToken,
    apigeeRefreshToken: exchangeResult.refreshToken,
    apigeeExpiresIn: exchangeResult.expiresIn,
    rolesWithAccess: userInfoResponse.roles_with_access,
    rolesWithoutAccess: userInfoResponse.roles_without_access,
    currentlySelectedRole: userInfoResponse.currently_selected_role,
    userDetails: userInfoResponse.user_details,
    lastActivityTime: Date.now()
  }

  const sessionManagementTableName = mockOidcConfig.sessionManagementTableName
  const validToken = checkIfValidTokenMapping(existingTokenMapping)
  if (validToken) {
    const username = tokenMappingItem.username
    logger.info("User already exists in token mapping table, creating draft session",
      {username}, {sessionManagementTableName})
    await insertTokenMapping(documentClient, sessionManagementTableName, tokenMappingItem, logger)
  } else {
    logger.info("No user token already exists or last activity was more than 15 minutes ago", {tokenMappingItem})
    await insertTokenMapping(documentClient, mockOidcConfig.tokenMappingTableName, tokenMappingItem, logger)
  }

  // this is what gets returned to cognito
  // access token and refresh token are not used by cognito so its ok that they are unusud
  return {
    statusCode: 200,
    body: JSON.stringify({
      access_token: "unused",
      expires_in: 3600,
      id_token: jwtToken,
      "not-before-policy": current_time,
      refresh_expires_in: 600,
      refresh_token: "unused",
      scope: "openid associatedorgs profile nationalrbacaccess nhsperson",
      session_state,
      token_type: "Bearer"
    })
  }
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(inputOutputLogger({logger: (request) => logger.info(request)}))
  .use(middyErrorHandler.errorHandler({logger}))
