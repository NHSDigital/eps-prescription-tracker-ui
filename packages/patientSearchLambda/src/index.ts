import {APIGatewayProxyEvent} from "aws-lambda"
import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import axios from "axios"
import inputOutputLogger from "@middy/input-output-logger"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"
import {authenticateRequest, getUsernameFromEvent} from "@cpt-ui-common/authFunctions"
import * as pds from "@cpt-ui-common/pdsClient"
import {
  AuthenticationParameters,
  ERROR_RESPONSE_BODY,
  HandlerInitialisationParameters,
  HandlerParameters,
  lambdaHandler
} from "./handler"

/*
This is the lambda code to search for a patient
It expects the following environment variables to be set

  TokenMappingTableName
  jwtPrivateKeyArn
  APIGEE_API_KEY
  APIGEE_API_SECRET
  jwtKid
  apigeeMockTokenEndpoint
  apigeeCIS2TokenEndpoint
  apigeePersonalDemographicsEndpoint
*/

export const newHandler = (
  {
    logger,
    axiosInstance,
    pdsEndpoint,
    authenticationParameters
  }: HandlerInitialisationParameters
) => {
  const pdsClient = new pds.Client(
    axiosInstance,
    pdsEndpoint,
    logger
  )

  const dynamoClient = new DynamoDBClient()
  const documentClient = DynamoDBDocumentClient.from(dynamoClient)

  const authenticationFunction = async (username: string) => {
    return await authenticateRequest(username, documentClient, logger, {
      ...authenticationParameters
    })
  }

  const params: HandlerParameters = {
    logger,
    pdsClient,
    usernameExtractor: getUsernameFromEvent,
    authenticationFunction
  }

  return middy((event: APIGatewayProxyEvent) => lambdaHandler(event, params))
    .use(injectLambdaContext(logger, {clearState: true}))
    .use(
      inputOutputLogger({
        logger: (request) => {
          logger.info(request)
        }
      })
    )
    .use(
      new MiddyErrorHandler(ERROR_RESPONSE_BODY)
        .errorHandler({logger: logger})
    )
}

// External endpoints and environment variables
const authParametersFromEnv = (): AuthenticationParameters => {
  return {
    tokenMappingTableName: process.env["TokenMappingTableName"] as string,
    jwtPrivateKeyArn: process.env["jwtPrivateKeyArn"] as string,
    apigeeApiKey: process.env["APIGEE_API_KEY"] as string,
    apigeeApiSecret: process.env["APIGEE_API_SECRET"] as string,
    jwtKid: process.env["jwtKid"] as string,
    defaultRoleId: process.env["roleId"] as string,
    apigeeMockTokenEndpoint: process.env["apigeeMockTokenEndpoint"] as string,
    apigeeCis2TokenEndpoint: process.env["apigeeCIS2TokenEndpoint"] as string
  }
}

const DEFAULT_HANDLER_PARAMETERS: HandlerInitialisationParameters = {
  logger: new Logger({serviceName: "patientSearchLambda"}),
  axiosInstance: axios.create(),
  pdsEndpoint: process.env["apigeePersonalDemographicsEndpoint"] as string,
  authenticationParameters: authParametersFromEnv()
}

export const handler = newHandler(DEFAULT_HANDLER_PARAMETERS)
