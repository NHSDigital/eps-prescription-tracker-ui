import {APP_CONFIG} from "@/constants/environment"
import pino from "pino"
import {cptAwsRum} from "./awsRum"
const REACT_LOG_LEVEL = APP_CONFIG.REACT_LOG_LEVEL || "debug"
class Logger {

  logger: pino.Logger

  constructor() {
    this.logger = pino({
      level: REACT_LOG_LEVEL,
      browser: {
        asObject: true
      }
    })
  }

  public trace(message: string, ...args: Array<unknown>): void {
    this.logger.trace(message, ...args)
  }

  public debug(message: string, ...args: Array<unknown>): void {
    this.logger.debug(message, ...args)
  }

  public info(message: string, ...args: Array<unknown>): void {
    this.logger.debug(message, ...args)
  }

  public warn(message: string, ...args: Array<unknown>): void {
    this.logger.warn(message, ...args)
  }

  public error(message: string, ...args: Array<unknown>): void {
    const rumInstance = cptAwsRum.getAwsRum()
    if (rumInstance !== null) {
      try {
        // get a stack trace so we get line numbers
        const messageAsError = new Error(message)
        rumInstance.recordEvent("logger_error", {message: message, stack: messageAsError.stack, details: args})
        // also use recordError to try and get source maps back to real line numbers
        rumInstance.recordError(messageAsError)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to log error to AWS RUM:", error)
      }
    }
    this.logger.error(message, ...args)
  }

}

export const logger = new Logger()
