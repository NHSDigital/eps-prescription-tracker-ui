import {APIGatewayProxyEvent} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import axios from "axios"
import inputOutputLogger from "@middy/input-output-logger"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {authenticateRequest, AuthenticateRequestOptions, getUsernameFromEvent} from "@cpt-ui-common/authFunctions"
import * as pds from "@cpt-ui-common/pdsClient"
import {INTERNAL_ERROR_RESPONSE_BODY, HandlerParameters, lambdaHandler} from "./handler"
import {URL} from "url"

/*
This file initialises dependencies and a lambda from the environment.
Testable program logic is stored in the handler.ts file.

The following environment variables are expected to be set:
  TokenMappingTableName
  jwtPrivateKeyArn
  APIGEE_API_KEY
  APIGEE_API_SECRET
  jwtKid
  apigeeMockTokenEndpoint
  apigeeCIS2TokenEndpoint
  apigeePersonalDemographicsEndpoint
*/

// External endpoints and environment variables
const authParametersFromEnv = (): AuthenticateRequestOptions => {
  return {
    tokenMappingTableName: process.env["TokenMappingTableName"] as string,
    jwtPrivateKeyArn: process.env["jwtPrivateKeyArn"] as string,
    apigeeApiKey: process.env["APIGEE_API_KEY"] as string,
    apigeeApiSecret: process.env["APIGEE_API_SECRET"] as string,
    jwtKid: process.env["jwtKid"] as string,
    apigeeMockTokenEndpoint: process.env["apigeeMockTokenEndpoint"] as string,
    apigeeCis2TokenEndpoint: process.env["apigeeCIS2TokenEndpoint"] as string
  }
}

// Logger
const logger = new Logger({serviceName: "patientSearchLambda"})

// PDS Client
const pdsEndpoint = new URL(process.env["apigeePersonalDemographicsEndpoint"] as string)
const axiosInstance = axios.create()
const pdsClient = new pds.Client(
  axiosInstance,
  pdsEndpoint,
  logger
)

// Authentication
const dynamoClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamoClient)

const authenticationParameters = authParametersFromEnv()

const authenticationFunction = async (username: string) => {
  return await authenticateRequest(username, documentClient, logger, {
    ...authenticationParameters
  })
}

const handlerParams: HandlerParameters = {
  logger,
  pdsClient,
  usernameExtractor: getUsernameFromEvent,
  authenticationFunction
}

const middyErrorHandler = new MiddyErrorHandler(INTERNAL_ERROR_RESPONSE_BODY)
  .errorHandler({logger})

export const handler = middy((event: APIGatewayProxyEvent) => lambdaHandler(event, handlerParams))
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(middyErrorHandler)
