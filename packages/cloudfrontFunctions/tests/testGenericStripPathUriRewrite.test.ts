
import {handler} from "../src/genericStripPathUriRewrite"

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("Generic Strip Path S3 URI Rewrite", () => {

  const testCases = [
    {
      description: "Path root",
      requestUri: "/api/",
      expectedOriginUri: "/"
    },
    {
      description: "Path nested",
      requestUri: "/api/endpoint/",
      expectedOriginUri: "/endpoint/"
    },
    {
      description: "Path deeply nested",
      requestUri: "/api/something/endpoint/",
      expectedOriginUri: "/something/endpoint/"
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
