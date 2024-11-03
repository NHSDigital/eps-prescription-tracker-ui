import {
  expect,
  describe,
  it,
  jest
} from "@jest/globals"

import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import {handler} from "../src/token"

// redefining readonly property of the performance object
const dummyContext = {
  callbackWaitsForEmptyEventLoop: true,
  functionVersion: "$LATEST",
  functionName: "foo-bar-function",
  memoryLimitInMB: "128",
  logGroupName: "/aws/lambda/foo-bar-function-123456abcdef",
  logStreamName: "2021/03/09/[$LATEST]abcdef123456abcdef123456abcdef123456",
  invokedFunctionArn: "arn:aws:lambda:eu-west-1:123456789012:function:foo-bar-function",
  awsRequestId: "c6af9ac6-7b61-11e6-9a41-93e812345678",
  requestId: "foo",
  getRemainingTimeInMillis: () => 1234,
  done: () => console.log("Done!"),
  fail: () => console.log("Failed!"),
  succeed: () => console.log("Succeeded!")
}

describe("test handler", () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  const testCases = [
    {
      description: "responds with error when body does not exist",
      event: {},
      mockReply: null,
      expectedResponse:{
        message: "A system error has occurred"
      }
    }
  ]

  testCases.forEach(({description, event, mockReply, expectedResponse}) => {
    it(description, async () => {
      if (mockReply) {
        jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockResolvedValue(mockReply as never)
      }
      const response = await handler(event, dummyContext)
      expect(response).toMatchObject(expectedResponse)
    })
  })
})
