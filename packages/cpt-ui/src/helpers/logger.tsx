import {APP_CONFIG} from "@/constants/environment"
import pino from "pino"
import {cptAwsRum} from "./awsRum"
const REACT_LOG_LEVEL = APP_CONFIG.REACT_LOG_LEVEL || "debug"

enum LogLevel {
  TRACE = "trace",
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error"
}

class Logger {

  logger: pino.Logger

  constructor() {
    this.logger = pino({
      level: REACT_LOG_LEVEL,
      browser: {
        asObject: true,
        formatters: {
          level: (label) => {
            return {
              level: label
            }
          }
        }
      }
    })
  }

  private sendToRum(logLevel: LogLevel, message: string, additionalFields?: unknown, error?: Error): void {
    const rumInstance = cptAwsRum.getAwsRum()
    if (rumInstance !== null) {
      rumInstance.recordEvent(`logger_${logLevel}`, {message, ...(additionalFields ? {...additionalFields}: {})})

      if(error){
        rumInstance.recordError(error)
      }
    }
  }

  public trace(message: string, args?: unknown, sendToRum: boolean = false): void {
    if (sendToRum){
      this.sendToRum(LogLevel.TRACE, message, args)
    }

    if (args) {
      this.logger.trace(args, message)
    } else {
      this.logger.trace(message)
    }
  }

  public debug(message: string, args?: unknown, sendToRum: boolean = false): void {
    if (sendToRum){
      this.sendToRum(LogLevel.DEBUG, message, args)
    }

    if (args) {
      this.logger.debug(args, message)
    } else {
      this.logger.debug(message)
    }
  }

  public info(message: string, args?: unknown, sendToRum: boolean = false): void {
    if (sendToRum){
      this.sendToRum(LogLevel.INFO, message, args)
    }

    if (args) {
      this.logger.info(args, message)
    } else {
      this.logger.info(message)
    }
  }

  public warn(message: string, args?: unknown, sendToRum: boolean = false): void {
    if (sendToRum){
      this.sendToRum(LogLevel.WARN, message, args)
    }

    if (args) {
      this.logger.warn(args, message)
    } else {
      this.logger.warn(message)
    }
  }

  public error(message: string, args?: unknown): void {
    const messageAsError = new Error(message)
    this.sendToRum(LogLevel.ERROR, message, {stack: messageAsError.stack, details: args}, messageAsError)
    if (args) {
      this.logger.error(args, message)
    } else {
      this.logger.error(message)
    }
  }

}

export const logger = new Logger()
