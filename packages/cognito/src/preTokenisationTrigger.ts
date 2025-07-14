// import {PreTokenGenerationTriggerHandler} from "aws-lambda"
// import {v4 as uuidv4} from "uuid"
// import {Logger} from "@aws-lambda-powertools/logger"
// import {DynamoDBClient, PutItemCommand} from "@aws-sdk/client-dynamodb"
// import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"

// import middy from "@middy/core"
// import inputOutputLogger from "@middy/input-output-logger"
// import {MiddyErrorHandler} from "@cpt-ui-common/middyErrorHandler"

// const client = new DynamoDBClient({})
// const SessionStateMappingTableName = process.env["SessionStateMappingTableName"] as string
// const logger = new Logger({serviceName: "preTokenisation"})
// const errorResponseBody = {message: "A system error has occurred"}
// const middyErrorHandler = new MiddyErrorHandler(errorResponseBody)

// // async function createUserDraftSessionRecord(table: string, user: string, id: string) {
// //   try {
// //     logger.info(`Attempting to record session ID to: ${table}`)
// //     const putCommand = new PutItemCommand({
// //       TableName: SessionStateMappingTableName,
// //       Item: {
// //         userName: {S: `Draft_${user}`},
// //         session_id: {S: id}
// //       }
// //     })

// //     await client.send(putCommand)
// //     logger.debug(`Generated new session_id for ${user}: ${id}`)
// //   } catch (error) {
// //     logger.error(`Error recording session ID: ${id} to: ${table}`)
// //     // logger.error(error)
// //     throw error
// //   }
// // }

// export const lambdaHandler: PreTokenGenerationTriggerHandler = async (event) => {

//   logger.debug("Environment variables", {SessionStateMappingTableName})

//   try {
//     const userName = event.userName
//     // const sessionId = uuidv4()

//     logger.info(`Username: ${userName}`)

//     // createUserDraftSessionRecord(SessionStateMappingTableName, userName, sessionId)

//     // event.response = {
//     //   claimsOverrideDetails: {
//     //     claimsToAddOrOverride: {
//     //       session_id: sessionId
//     //     }
//     //   }
//     // }

//     logger.debug(`Event returned: ${event}`)

//     return event
//   } catch (error) {
//     logger.debug(`Error in Pre Token Generation trigger: ${error}`)
//     throw error // this will cause Cognito to fail gracefully, not loop
//   }
// }

// export const handler = middy(lambdaHandler)
//   .use(injectLambdaContext(logger, {clearState: true}))
//   .use(inputOutputLogger({logger: (request) => logger.info(request)}))
//   .use(middyErrorHandler.errorHandler({logger}))
