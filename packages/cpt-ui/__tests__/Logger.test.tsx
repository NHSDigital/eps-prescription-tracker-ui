import {AwsRum} from "aws-rum-web"

const mockRecordEvent = jest.fn()
const mockRecordError = jest.fn()

const mockGetAwsRum = jest.fn()

jest.mock("@/helpers/awsRum", () => ({
  cptAwsRum: {
    getAwsRum: (...args: Array<unknown>) => mockGetAwsRum(...args)
  }
}))

jest.mock("@/constants/environment", () => ({
  APP_CONFIG: {
    REACT_LOG_LEVEL: "debug"
  }
}))

jest.mock("pino", () => {
  const mockLogger = {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
  return jest.fn(() => mockLogger)
})

import {logger} from "@/helpers/logger"
import pino from "pino"

const mockPinoInstance = (pino as unknown as jest.Mock)() as Record<string, jest.Mock>

function createMockRumInstance() {
  return {
    recordEvent: mockRecordEvent,
    recordError: mockRecordError
  } as unknown as AwsRum
}

describe("Logger", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("sendToRum", () => {
    it("should not call recordEvent when RUM instance is null", () => {
      mockGetAwsRum.mockReturnValue(null)

      logger.info("test message", undefined, true)

      expect(mockGetAwsRum).toHaveBeenCalled()
      expect(mockRecordEvent).not.toHaveBeenCalled()
    })

    it("should call recordEvent with correct event name and message for each log level", () => {
      const rumInstance = createMockRumInstance()
      mockGetAwsRum.mockReturnValue(rumInstance)

      logger.trace("trace msg", undefined, true)
      expect(mockRecordEvent).toHaveBeenCalledWith("logger_trace", {message: "trace msg"})

      mockRecordEvent.mockClear()
      logger.debug("debug msg", undefined, true)
      expect(mockRecordEvent).toHaveBeenCalledWith("logger_debug", {message: "debug msg"})

      mockRecordEvent.mockClear()
      logger.info("info msg", undefined, true)
      expect(mockRecordEvent).toHaveBeenCalledWith("logger_info", {message: "info msg"})

      mockRecordEvent.mockClear()
      logger.warn("warn msg", undefined, true)
      expect(mockRecordEvent).toHaveBeenCalledWith("logger_warn", {message: "warn msg"})
    })

    it("should include additionalFields in recordEvent when provided", () => {
      const rumInstance = createMockRumInstance()
      mockGetAwsRum.mockReturnValue(rumInstance)

      const additionalFields = {userId: "123", action: "login"}
      logger.info("test message", additionalFields, true)

      expect(mockRecordEvent).toHaveBeenCalledWith("logger_info", {
        message: "test message",
        userId: "123",
        action: "login"
      })
    })

    it("should not include additionalFields when they are not provided", () => {
      const rumInstance = createMockRumInstance()
      mockGetAwsRum.mockReturnValue(rumInstance)

      logger.info("test message", undefined, true)

      expect(mockRecordEvent).toHaveBeenCalledWith("logger_info", {message: "test message"})
    })

    it("should not call recordError for non-error log levels", () => {
      const rumInstance = createMockRumInstance()
      mockGetAwsRum.mockReturnValue(rumInstance)

      logger.info("info msg", undefined, true)

      expect(mockRecordError).not.toHaveBeenCalled()
    })

    it("should call recordError when error level is used", () => {
      const rumInstance = createMockRumInstance()
      mockGetAwsRum.mockReturnValue(rumInstance)

      logger.error("something went wrong")

      expect(mockRecordEvent).toHaveBeenCalledWith(
        "logger_error",
        expect.objectContaining({
          message: "something went wrong",
          stack: expect.any(String)
        })
      )
      expect(mockRecordError).toHaveBeenCalledWith(expect.any(Error))
      expect(mockRecordError.mock.calls[0][0].message).toBe("something went wrong")
    })

    it("should call recordError with additional details when args are provided to error", () => {
      const rumInstance = createMockRumInstance()
      mockGetAwsRum.mockReturnValue(rumInstance)

      const errorDetails = {code: 500, endpoint: "/api/test"}
      logger.error("api failure", errorDetails)

      expect(mockRecordEvent).toHaveBeenCalledWith(
        "logger_error",
        expect.objectContaining({
          message: "api failure",
          stack: expect.any(String),
          details: errorDetails
        })
      )
      expect(mockRecordError).toHaveBeenCalledWith(expect.any(Error))
    })

    it("should not send to RUM when sendToRum flag is false", () => {
      const rumInstance = createMockRumInstance()
      mockGetAwsRum.mockReturnValue(rumInstance)

      logger.info("no rum message", undefined, false)

      expect(mockGetAwsRum).not.toHaveBeenCalled()
      expect(mockRecordEvent).not.toHaveBeenCalled()
    })

    it("should not send to RUM when sendToRum flag is not provided (defaults to false)", () => {
      const rumInstance = createMockRumInstance()
      mockGetAwsRum.mockReturnValue(rumInstance)

      logger.info("no rum message")

      expect(mockGetAwsRum).not.toHaveBeenCalled()
      expect(mockRecordEvent).not.toHaveBeenCalled()
    })

    it("should still log to pino even when sending to RUM", () => {
      const rumInstance = createMockRumInstance()
      mockGetAwsRum.mockReturnValue(rumInstance)

      logger.info("test message", undefined, true)

      expect(mockRecordEvent).toHaveBeenCalled()
      expect(mockPinoInstance.info).toHaveBeenCalledWith("test message")
    })

    it("should log to pino with args when provided alongside RUM", () => {
      const rumInstance = createMockRumInstance()
      mockGetAwsRum.mockReturnValue(rumInstance)

      const args = {key: "value"}
      logger.info("test message", args, true)

      expect(mockRecordEvent).toHaveBeenCalled()
      expect(mockPinoInstance.info).toHaveBeenCalledWith(args, "test message")
    })

    it("should always send errors to RUM without needing sendToRum flag", () => {
      const rumInstance = createMockRumInstance()
      mockGetAwsRum.mockReturnValue(rumInstance)

      logger.error("error message")

      expect(mockRecordEvent).toHaveBeenCalledWith(
        "logger_error",
        expect.objectContaining({message: "error message"})
      )
      expect(mockRecordError).toHaveBeenCalled()
    })
  })
})
