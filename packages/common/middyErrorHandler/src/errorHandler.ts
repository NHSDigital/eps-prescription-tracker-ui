/* eslint-disable @typescript-eslint/no-explicit-any */
import {MiddlewareObj} from "@middy/core"
import {Logger} from "@aws-lambda-powertools/logger"

type MockLogger = {
  error: (error: Error, message: string) => void;
  warn: (message: string) => void;
  info: (message: string) => void;
  debug: (message: string) => void;
};

// eslint-disable-next-line no-undef
type HandlerLogger = Console | MockLogger | Logger;
type LoggerAndLevel = {
  logger?: HandlerLogger;
  level?: string;
};

const validLevels: Array<keyof HandlerLogger> = ["info", "warn", "error", "debug"]

class MiddyErrorHandler {
  handlerResponse: object

  constructor(handlerResponse: object) {
    this.handlerResponse = handlerResponse
  }
  // custom middy error handler to just log the error and return details

  errorHandler({logger = console, level = "error"}: LoggerAndLevel) {
    return {
      onError: async (handler) => {
        const error: any = handler.error

        if (validLevels.includes(level as any)) {
          const logLevel = level as keyof HandlerLogger
          if (logLevel === "error") {
            if (typeof logger[logLevel] === "function") {
              logger[logLevel](
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                {
                  error: ((e) => ({
                    name: e.name,
                    message: e.message,
                    stack: e.stack,
                    details: e.details,
                    cause: e.cause,
                    status: e.status,
                    statusCode: e.statusCode,
                    expose: e.expose
                  }))(error)
                } as never,
                `${error.name}: ${error.message}` as never
              )
            }
          }
        }

        // if there are a `statusCode` and an `error` field
        // this is a valid http error object

        handler.response = this.handlerResponse
      }
    } satisfies MiddlewareObj<any, any, Error, any>
  }
}

export {MiddyErrorHandler}
