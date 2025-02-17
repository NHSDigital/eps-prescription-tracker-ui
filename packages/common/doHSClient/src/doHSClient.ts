import {Logger} from "@aws-lambda-powertools/logger"

// Initialize a logger for DoHS Client
const logger = new Logger({serviceName: "doHSClient"})

// Log a message when the module is imported
logger.info("doHSClient module has been imported.")

// Placeholder function for future DoHS API calls
export const doHSClient = () => {
  logger.info("doHSClient function was called.")
}
