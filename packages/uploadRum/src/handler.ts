import {CloudFormationCustomResourceHandler} from "aws-lambda"

import {Logger} from "@aws-lambda-powertools/logger"
import {injectLambdaContext} from "@aws-lambda-powertools/logger/middleware"
import middy from "@middy/core"
import inputOutputLogger from "@middy/input-output-logger"

import {sendFailureMessage, sendSuccessMessage} from "./aws"
import {customPropertiesTypeGuard} from "./api"
import {destroy, upsert} from "./utils"

const logger = new Logger({serviceName: "uploadRum"})

const lambdaHandler: CloudFormationCustomResourceHandler = async (
  event
) => {
  logger.info("Received request to update the RUM template", {
    props: event.ResourceProperties,
    requestType: event.RequestType
  })

  if (!customPropertiesTypeGuard(event.ResourceProperties)) {
    await sendFailureMessage(event)
    return
  }

  try {
    switch (event.RequestType) {
      case "Create":
        await upsert(event.ResourceProperties, logger)
        break
      case "Update":
        await upsert(event.ResourceProperties, logger)
        break
      case "Delete":
        await destroy(event.ResourceProperties, logger)
        break
    }
    logger.info("Processed request to update the RUM template", {
      props: event.ResourceProperties,
      requestType: event.RequestType
    })

    await sendSuccessMessage(event, logger)
    return
  } catch (e) {
    logger.error("Error processing event", {e})
    await sendFailureMessage(event, logger)
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
