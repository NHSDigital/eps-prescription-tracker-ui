import {expect, describe, it} from "@jest/globals"
import {APIGatewayProxyEvent} from "aws-lambda"
import {mockLogger} from "@cpt-ui-common/testing"
import {lambdaHandler, HandlerParameters} from "../src/handler"

describe("lambda handler unit tests", () => {
  let handlerParams: HandlerParameters
  let mockEvent: APIGatewayProxyEvent

  beforeEach(() => {
    mockEvent = {} as unknown as APIGatewayProxyEvent

    handlerParams = {
      logger: mockLogger(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pdsClient: {} as any,
      usernameExtractor: () => "test-username",
      authenticationFunction: async () => {
        return {apigeeAccessToken: "test-access-token", roleId: "test-role-id"}
      }
    }
  })

  it("should return an error if username cannot be extracted from event", async () => {
    handlerParams.usernameExtractor = () => {
      throw new Error("Username not found")
    }

    const response = await lambdaHandler(mockEvent, handlerParams)

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body)).toEqual({
      message: "Username not found in event"
    })
  })

  it("should return an error if authentication fails", async () => {
    handlerParams.authenticationFunction = () => {
      throw new Error("Authentication failed")
    }

    const response = await lambdaHandler(mockEvent, handlerParams)

    expect(response.statusCode).toBe(401)
    expect(JSON.parse(response.body)).toEqual({
      message: "Authentication failed"
    })
  })
})
