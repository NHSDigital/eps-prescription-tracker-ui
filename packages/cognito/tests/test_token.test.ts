import {
  expect,
  describe,
  it,
  jest
} from "@jest/globals"

import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb"
import createJWKSMock from "mock-jwks"
import nock from "nock"
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
  const jwks = createJWKSMock("https://dummyauth.com/")
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    jwks.start()
  })

  afterEach(() => {
    jwks.stop()
  })
  it("responds with error when body does not exist", async () => {

    const response = await handler({}, dummyContext)
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })
  })

  it("works", async () => {
    const dynamoSpy = jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockResolvedValue({} as never)

    const token = jwks.token({
      iss: "valid_iss",
      aud: "valid_aud"
    })
    nock("https://dummytoken.com")
      .post("/token")
      .reply(200, {
        id_token: token
      })

    const response = await handler({
      body: {
        foo: "bar"
      }
    }, dummyContext)
    expect(response.body).toMatch(JSON.stringify({
      id_token: token
    }))
    expect(dynamoSpy).toHaveBeenCalledTimes(1)
  })
})
