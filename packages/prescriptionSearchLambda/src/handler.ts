import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import {getSecret} from "@aws-lambda-powertools/parameters/secrets"
import inputOutputLogger from "@middy/input-output-logger"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import axios, {AxiosError} from "axios"
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
  logger.info("Lambda handler invoked", {event})

  const axiosInstance = axios.create()

  const body = event.body
  if (body === undefined) {
    logger.error("Request body is missing")
    throw new Error("Request body is missing")
  }

  const objectBodyParameters = parse(body as string)
  logger.debug("Parsed request body parameters", {objectBodyParameters})

  let rewrittenObjectBodyParameters: ParsedUrlQuery

  if (useSignedJWT === "true") {
    try {
      logger.info("Fetching JWT private key")
      const jwtPrivateKey = await getSecret(jwtPrivateKeyArn)
      rewrittenObjectBodyParameters = rewriteBodyToAddSignedJWT(
        logger, objectBodyParameters, idpTokenPath, jwtPrivateKey as PrivateKey
      )
      logger.debug("Rewritten body with signed JWT", {rewrittenObjectBodyParameters})
    } catch (error) {
      logger.error("Error fetching or processing JWT private key", {error})
      throw error
    }
  } else {
    rewrittenObjectBodyParameters = objectBodyParameters
    logger.info("JWT signing is not enabled, using original body parameters")
  }

  logger.debug("Calling downstream IDP with rewritten body", {idpTokenPath, body: rewrittenObjectBodyParameters})

  try {
    const tokenResponse = await axiosInstance.post(idpTokenPath, stringify(rewrittenObjectBodyParameters))
    logger.debug("Response from external OIDC", {data: tokenResponse.data})

    const accessToken = tokenResponse.data.access_token
    const idToken = tokenResponse.data.id_token

    // Ensure tokens exist before proceeding
    if (!accessToken || !idToken) {
      logger.error("Failed to retrieve tokens from OIDC response")
      throw new Error("Failed to retrieve tokens from OIDC response")
    }

    // Verify and decode idToken
    logger.info("Verifying and decoding ID token")
    const decodedIdToken = await verifyJWTWrapper(idToken, oidcIssuer, oidcClientId)
    logger.debug("Decoded idToken", {decodedIdToken})

    const username = `${UserPoolIdentityProvider}_${decodedIdToken.sub}`
    const params = {
      Item: {
        username,
        accessToken,
        idToken,
        expiresIn: decodedIdToken.exp,
      },
      TableName: TokenMappingTableName,
    }

    logger.debug("Inserting into DynamoDB", {params})
    await documentClient.send(new PutCommand(params))

    // Extract prescriptionId and make the Apigee API call
    const prescriptionId = objectBodyParameters["prescriptionId"] as string || "defaultId"
    if (!prescriptionId || prescriptionId === "defaultId") {
      logger.warn("Missing or invalid prescriptionId in request")
      return {
        statusCode: 400,
        body: JSON.stringify({message: "Invalid prescriptionId provided"}),
      }
    }

    try {
      logger.info("Calling Apigee endpoint", {endpoint: `${apigeeEndpoint}/prescription-search/${prescriptionId}`})
      const apigeeResponse = await axiosInstance.get(`${apigeeEndpoint}/prescription-search/${prescriptionId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "NHSD-Session-URID": roleId,
        },
      })

      logger.debug("Response from Apigee", {data: apigeeResponse.data})

      return {
        statusCode: 200,
        body: JSON.stringify(apigeeResponse.data),
        headers: formatHeaders(apigeeResponse.headers),
      }
    } catch (apigeeError) {
      if (axios.isAxiosError(apigeeError)) {
        logger.error("Error calling Apigee API", {error: apigeeError.message, response: apigeeError.response?.data})
        return {
          statusCode: apigeeError.response?.status || 500,
          body: JSON.stringify({
            message: "Failed to fetch data from Apigee API",
            details: apigeeError.response?.data || "Unknown error",
          }),
        }
      } else {
        logger.error("Unexpected error calling Apigee API", {error: String(apigeeError)})
        return {
          statusCode: 500,
          body: JSON.stringify({
            message: "Failed to fetch data from Apigee API",
            details: "An unexpected error occurred",
          }),
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Error occurred in Lambda handler", {error: error.message})
    } else {
      logger.error("Unknown error occurred in Lambda handler", {error: String(error)})
    }
    return {
      statusCode: 500,
      body: JSON.stringify({message: "Internal server error"}),
    }
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
