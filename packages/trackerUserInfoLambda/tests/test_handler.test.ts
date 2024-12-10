import { mockContext, mockAPIGatewayProxyEvent } from "./mockObjects"

import { handler } from "../src/handler"

describe("Basic handler invocation", () => {
  let event = mockAPIGatewayProxyEvent
  let context = mockContext

  it("should return a response when called", async () => {

    const response = await handler(event, context)
    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode")
    expect(response).toHaveProperty("body")
  })
})
