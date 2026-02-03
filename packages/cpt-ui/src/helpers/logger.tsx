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

  public trace(message: string, args?: unknown): void {
    if (args) {
      this.logger.trace(args, message)
    } else {
      this.logger.trace(message)
    }
  }

  public debug(message: string, args?: unknown): void {
    const rumInstance = cptAwsRum.getAwsRum()
    if (rumInstance !== null) {
      rumInstance.recordEvent("TEST_LOG", {message})
    }
    if (args) {
      this.logger.debug(args, message)
    } else {
      this.logger.debug(message)
    }
  }

  public info(message: string, args?: unknown): void {
    if (args) {
      this.logger.info(args, message)
    } else {
      this.logger.info(message)
    }
  }

  public warn(message: string, args?: unknown): void {
    if (args) {
      this.logger.warn(args, message)
    } else {
      this.logger.warn(message)
    }
  }

  public error(message: string, args?: unknown): void {
    const rumInstance = cptAwsRum.getAwsRum()
    if (rumInstance !== null) {
      // get a stack trace so we get line numbers
      const messageAsError = new Error(message)
      rumInstance.recordEvent("logger_error", {message: message, stack: messageAsError.stack, details: args})
      // also use recordError to try and get source maps back to real line numbers
      rumInstance.recordError(messageAsError)
    }
    if (args) {
      this.logger.error(args, message)
    } else {
      this.logger.error(message)
    }
  }

}

export const logger = new Logger()
