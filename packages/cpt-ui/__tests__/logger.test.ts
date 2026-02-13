/* eslint-disable @typescript-eslint/no-explicit-any */
import {jest} from "@jest/globals"
import {logger} from "../src/helpers/logger"
import {cptAwsRum} from "../src/helpers/awsRum"

describe("logger", () => {

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("sends log to RUM when called with send flag", async () => {
    const mock = jest.fn()
    cptAwsRum.getAwsRum = jest.fn(() => ({
      recordEvent: mock
    })) as unknown as any

    logger.info("test log", {bonus_arg: "value"}, true)

    expect(mock).toHaveBeenCalledWith("logger_info", {"bonus_arg": "value", "message": "test log"})
  })

  it("does not sends log to RUM when called with send flag as false", async () => {
    const mock = jest.fn()
    cptAwsRum.getAwsRum = jest.fn(() => ({
      recordEvent: mock
    })) as unknown as any

    logger.info("test log", {bonus_arg: "value"}, false)

    expect(mock).not.toHaveBeenCalled()
  })

  it("does not sends log to RUM when called without send flag", async () => {
    const mock = jest.fn()
    cptAwsRum.getAwsRum = jest.fn(() => ({
      recordEvent: mock
    })) as unknown as any

    logger.info("test log", {bonus_arg: "value"})

    expect(mock).not.toHaveBeenCalled()
  })
})
