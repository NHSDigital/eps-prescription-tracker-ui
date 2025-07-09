import {Logger} from "@aws-lambda-powertools/logger"

const handler = async (event) => {
  const logger = new Logger({serviceName: "postAuthentication"})

  logger.info(event)

  return event
}

export {handler}
