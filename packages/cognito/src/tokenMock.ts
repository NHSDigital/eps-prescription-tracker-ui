import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"
import axios from "axios"
import {parse, stringify} from "querystring"
import {initializeOidcConfig} from "@cpt-ui-common/authFunctions"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
/*
This is the lambda code that is used to intercept calls to token endpoint as part of the cognito login flow
It expects the following environment variables to be set

TokenMappingTableName
APIGEE_API_KEY
APIGEE_API_SECRET
COGNITO_DOMAIN

MOCK_OIDC_ISSUER
MOCK_OIDC_CLIENT_ID
MOCK_OIDCJWKS_ENDPOINT
MOCK_USER_INFO_ENDPOINT
MOCK_USER_POOL_IDP
*/

const logger = new Logger({serviceName: "tokenMock"})
const {mockOidcConfig} = initializeOidcConfig()

// Environment variables

const cognitoDomain= process.env["COGNITO_DOMAIN"] as string
const tokenMappingTable= process.env["TokenMappingTableName"] as string
const apigeeApiKey= process.env["APIGEE_API_KEY"] as string
const apigeeApiSecret= process.env["APIGEE_API_SECRET"] as string

const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)
const axiosInstance = axios.create()

const errorResponseBody = {message: "A system error has occurred"}
const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

async function storeApigeeTokenInfo(username: string, tokenData: {
  accessToken: string;
  expirationTime: number;
  refreshToken: string;
  selectedRoleId: string;
}) {
  logger.debug("Storing token information", {username, expirationTime: tokenData.expirationTime})
  try {
    await documentClient.send(
      new UpdateCommand({
        TableName: tokenMappingTable,
        Key: {username},
        UpdateExpression: `
          SET apigee_accessToken = :apigee_accessToken,
          apigee_expiresIn = :apigee_expiresIn, 
          apigee_refreshToken = :apigee_refreshToken, 
          selectedRoleId = :selectedRoleId
          `,
        ExpressionAttributeValues: {
          ":apigee_accessToken": tokenData.accessToken,
          ":apigee_expiresIn": tokenData.expirationTime,
          ":apigee_refreshToken": tokenData.refreshToken,
          ":selectedRoleId": tokenData.selectedRoleId
        }
      })
    )
  } catch (error) {
    logger.error("Failed to store token information", {error})
    throw new Error("Failed to store token information in DynamoDB")
  }
}

async function exchangeApigeeCode(apigeeCode: string) {
  const params = {
    grant_type: "authorization_code",
    client_id: apigeeApiKey,
    client_secret: apigeeApiSecret,
    redirect_uri: `https://${cognitoDomain}/oauth2/idpresponse`,
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

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.appendKeys({"apigw-request-id": event.requestContext?.requestId})

  logger.debug("data from env variables", {
    tokenMappingTable
  })

  const {code} = parse(event.body || "")
  if (!code) throw new Error("Code parameter is missing")
  if (Array.isArray(code)) throw new Error("More than one code parameter found")

  const tokenResponse = await exchangeApigeeCode(code)
  logger.debug("Token response", {tokenResponse})

  const userInfo = await getUserInfo(tokenResponse.access_token)
  const current_time = Math.floor(Date.now() / 1000)
  const expirationTime = current_time + parseInt(tokenResponse.expires_in)
  const username = `${mockOidcConfig.userPoolIdp}_${userInfo.sub}`

  await storeApigeeTokenInfo(username, {
    accessToken: tokenResponse.access_token,
    expirationTime,
    refreshToken: tokenResponse.refresh_token,
    selectedRoleId: userInfo.selected_roleid
  })

  return {
    statusCode: 200,
    body: JSON.stringify({
      access_token: tokenResponse.access_token,
      expires_in: tokenResponse.expires_in,
      "not-before-policy": current_time,
      refresh_expires_in: tokenResponse.refresh_token_expires_in,
      refresh_token: tokenResponse.refresh_token,
      scope: "openid associatedorgs profile nationalrbacaccess nhsperson email",
      token_type: tokenResponse.token_type
    })
  }
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(inputOutputLogger({logger: (request) => logger.info(request)}))
  .use(middyErrorHandler.errorHandler({logger}))
