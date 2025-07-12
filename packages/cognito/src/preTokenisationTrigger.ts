import {PreTokenGenerationTriggerHandler} from "aws-lambda"
import {v4 as uuidv4} from "uuid"
import {Logger} from "@aws-lambda-powertools/logger"

export const handler: PreTokenGenerationTriggerHandler = async (event) => {
  const logger = new Logger({serviceName: "preTokenisation"})

  const sessionId = uuidv4()

  // Add the session_id to the ID token claims
  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        session_id: sessionId
      }
    }
  }

  logger.info(`Issued session_id ${sessionId} for user ${event.userName}`)

  return event
}
