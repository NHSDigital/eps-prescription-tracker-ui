import {handler} from "../src/s3404ModifyStatusCode"

const mockEvent = {
  response: {
    statusCode: 200,
    statusDescription: "OK"
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("S3 404 Modify Status Code", () => {
  it("Returns a response with a 404 status code", async() => {
    const result: any = await handler(mockEvent)
    expect(result.statusCode).toEqual(404)
  })

  it("Returns a response with a Not Found status description", async() => {
    const result: any = await handler(mockEvent)
    expect(result.statusDescription).toEqual("Not Found")
  })
})
