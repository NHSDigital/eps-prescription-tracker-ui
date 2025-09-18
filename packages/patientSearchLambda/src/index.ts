import {APIGatewayProxyEventBase} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import axios from "axios"
import inputOutputLogger from "@middy/input-output-logger"
import httpHeaderNormalizer from "@middy/http-header-normalizer"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {authenticationMiddleware, authParametersFromEnv, AuthResult} from "@cpt-ui-common/authFunctions"
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
  FULL_CLOUDFRONT_DOMAIN
  apigeePersonalDemographicsEndpoint
*/

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

const handlerParams: HandlerParameters = {
  logger,
  pdsClient
}

const middyErrorHandler = new MiddyErrorHandler(INTERNAL_ERROR_RESPONSE_BODY)
  .errorHandler({logger})

export const handler = middy((event: APIGatewayProxyEventBase<AuthResult>) => lambdaHandler(event, handlerParams))
  .use(authenticationMiddleware({
    axiosInstance,
    ddbClient: documentClient,
    authOptions: authenticationParameters,
    logger
  }))
  .use(injectLambdaContext(logger, {clearState: true}))
  .use(httpHeaderNormalizer())
  .use(
    inputOutputLogger({
      logger: (request) => {
        logger.info(request)
      }
    })
  )
  .use(middyErrorHandler)
