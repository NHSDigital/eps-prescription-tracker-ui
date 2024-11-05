/* eslint-disable @typescript-eslint/no-explicit-any */
import {MiddlewareObj} from "@middy/core"
import {Logger} from "@aws-lambda-powertools/logger"

type MockLogger = {
  error: (error: Error, message: string) => void;
};
// eslint-disable-next-line no-undef
type HandlerLogger = Console | MockLogger | Logger;
type LoggerAndLevel = {
  logger?: HandlerLogger;
  level?: string;
};

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

        // if there are a `statusCode` and an `error` field
        // this is a valid http error object
        if (typeof logger[level] === "function") {
          logger[level](
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
            },
            `${error.name}: ${error.message}`
          )
        }

        handler.response = this.handlerResponse
      }
    } satisfies MiddlewareObj<any, any, Error, any>
  }
}

export {MiddyErrorHandler}
