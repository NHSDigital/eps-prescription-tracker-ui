import {handler} from "../src/s3404UriRewrite"

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("S3 404 URI Rewrite", () => {
  const testCases = [
    {
      description: "Invalid domain root",
      requestUri: "/",
      expectedOriginUri: "/404.html"
    },
    {
      description: "Invalid nested path",
      requestUri: "/invalid/page/",
      expectedOriginUri: "/404.html"
    },
    {
      description: "Invalid deeply nested path",
      requestUri: "/invalid/area1/area2/page/",
      expectedOriginUri: "/404.html"
    },
    {
      description: "Invalid specified file at root ",
      requestUri: "/file.ext",
      expectedOriginUri: "/404.html"
    },
    {
      description: "Invalid nested file",
      requestUri: "/invalid/file.ext",
      expectedOriginUri: "/404.html"
    }
  ]

  testCases.forEach(({description, requestUri, expectedOriginUri}) => {
    it(description, async() => {
      const mockEvent = {
        request: {
          method: "GET",
          uri: requestUri
        }
      }
      const result: any = await handler(mockEvent)
      expect(result.uri).toEqual(expectedOriginUri)
    })
  })
})
