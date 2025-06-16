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
      // get a stack trace so we get line numbers
      const stack = new Error(message).stack
      rumInstance.recordEvent("logger_error", {message: stack, details: args})
    }
    this.logger.error(message, ...args)
  }

}

export const logger = new Logger()
