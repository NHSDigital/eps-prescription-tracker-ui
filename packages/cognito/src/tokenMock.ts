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
import {initializeOidcConfig} from "@cpt-ui-common/authFunctions"
import {updateTokenMapping, getSessionState} from "@cpt-ui-common/dynamoFunctions"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
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
const jwtPrivateKeyArn= process.env["jwtPrivateKeyArn"] as string
const jwtKid= process.env["jwtKid"] as string
const SessionStateMappingTableName = process.env["SessionStateMappingTableName"] as string
const idpTokenPath= process.env["MOCK_IDP_TOKEN_PATH"] as string

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true
  }})

const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

async function createSignedJwt(claims: Record<string, unknown>) {
  const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
  return jwt.sign(claims, jwtPrivateKey as PrivateKey, {
    algorithm: "RS512",
    keyid: jwtKid
  })
}

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
    SessionStateMappingTableName,
    idpTokenPath
  })

  const {code} = parse(event.body || "")
  if (!code) throw new Error("Code parameter is missing")

  const sessionState = await getSessionState(documentClient, SessionStateMappingTableName, code as string, logger)

  const current_time = Math.floor(Date.now() / 1000)
  const expirationTime = current_time + 600
  const baseUsername = uuidv4()
  const username = `${mockOidcConfig.userPoolIdp}_${baseUsername}`

  const jwtClaims = {
    exp: expirationTime,
    iat: current_time,
    jti: uuidv4(),
    iss: mockOidcConfig.oidcIssuer,
    aud: mockOidcConfig.oidcClientID,
    sub: baseUsername,
    typ: "ID",
    azp: mockOidcConfig.oidcClientID,
    sessionState: sessionState.SessionState,
    acr: "AAL3_ANY",
    sid: sessionState.SessionState,
    id_assurance_level: "3",
    uid: baseUsername,
    amr: ["N3_SMARTCARD"],
    name: baseUsername,
    authentication_assurance_level: "3",
    given_name: baseUsername,
    family_name: baseUsername
  }

  const jwtToken = await createSignedJwt(jwtClaims)

  // as we now have all the user information including roles, and apigee tokens
  // store them in the token mapping table
  await updateTokenMapping(
    documentClient,
    mockOidcConfig.tokenMappingTableName,
    {
      username,
      apigeeCode: sessionState.ApigeeCode
    },
    logger
  )

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
      scope: "openid associatedorgs profile nationalrbacaccess nhsperson email",
      session_state: sessionState.SessionState,
      token_type: "Bearer"
    })
  }
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(inputOutputLogger({logger: (request) => logger.info(request)}))
  .use(middyErrorHandler.errorHandler({logger}))
