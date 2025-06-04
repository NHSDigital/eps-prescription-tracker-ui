import {Logger} from "@aws-lambda-powertools/logger"
import {jest} from "@jest/globals"

export const mockLogger = (): Logger => {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    appendKeys: jest.fn()
  } as unknown as Logger
}
