import {APP_CONFIG} from "@/constants/environment"
import pino from "pino"
import {getAwsRum} from "./awsRum"
import {AwsRum} from "aws-rum-web"
const REACT_LOG_LEVEL = APP_CONFIG.REACT_LOG_LEVEL || "debug"

/**
 * Supported logging levels by names, the index is the level number.
 */
export const LOG_LEVEL_NAMES = ["trace", "debug", "info", "warn", "error", "silent"]

/**
 * Lightweight logger with minimal log level restrictions
 * @class Log
 */
class Logger {

  logger: pino.Logger
  rumContext: AwsRum | null

  constructor() {
    this.rumContext = getAwsRum()
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
    if (this.rumContext !== null) {
      this.rumContext.recordError(args)
    }
    this.logger.error(message, ...args)
  }

}

export const logger = new Logger()
