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
import {formatHeaders, rewriteBodyToAddSignedJWT, verifyJWTWrapper} from "./helpers"

const logger = new Logger({serviceName: "token"})
const UserPoolIdentityProvider = process.env["UserPoolIdentityProvider"] as string
const idpTokenPath = process.env["idpTokenPath"] as string
const TokenMappingTableName = process.env["TokenMappingTableName"] as string
const useSignedJWT = process.env["useSignedJWT"] as string
const jwtPrivateKeyArn = process.env["jwtPrivateKeyArn"] as string
const oidcClientId = process.env["oidcClientId"] as string
const oidcIssuer = process.env["oidcIssuer"] as string
const apigeeEndpoint = "https://internal-dev.api.service.nhs.uk/clinical-prescription-tracker"
const roleId = "555254242106"

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

  if (useSignedJWT === "true") {
    const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
    rewrittenObjectBodyParameters = rewriteBodyToAddSignedJWT(
      logger, objectBodyParameters, idpTokenPath, jwtPrivateKey as PrivateKey)
  } else {
    rewrittenObjectBodyParameters = objectBodyParameters
  }

  logger.debug("about to call downstream idp with rewritten body", {idpTokenPath, body: rewrittenObjectBodyParameters})

  const tokenResponse = await axiosInstance.post(idpTokenPath,
    stringify(rewrittenObjectBodyParameters)
  )

  logger.debug("response from external oidc", {data: tokenResponse.data})

  const accessToken = tokenResponse.data.access_token
  const idToken = tokenResponse.data.id_token

  // verify and decode idToken
  const decodedIdToken = await verifyJWTWrapper(idToken, oidcIssuer, oidcClientId)
  logger.debug("decoded idToken", {decodedIdToken})

  const username = `${UserPoolIdentityProvider}_${decodedIdToken.sub}`
  const params = {
    Item: {
      "username": username,
      "accessToken": accessToken,
      "idToken": idToken,
      "expiresIn": decodedIdToken.exp
    },
    TableName: TokenMappingTableName
  }

  logger.debug("going to insert into dynamodb", {params})
  await documentClient.send(new PutCommand(params))

  logger.debug("Endpoint success")

  // call Apigee with accessToken and PrescriptionID
  // const prescriptionID = objectBodyParameters["prescriptionID"] as string || "defaultID"

  // const apigeeResponse = await axiosInstance.get(`${apigeeEndpoint}/prescription-search/${prescriptionID}`, {
  //   headers: {
  //     Authorization: `Bearer ${accessToken}`,
  //     "NHSD-Session-URID": roleId
  //   }
  // })

  // logger.debug("Response from Apigee", {data: apigeeResponse.data})

  return {
    statusCode: 200,
    body: JSON.stringify(apigeeResponse.data),
    headers: formatHeaders(apigeeResponse.headers)
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
