import {handler} from "../src/s3JwksUriRewrite"

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("S3 JWKS URI Rewrite", () => {
  const testCases = [
    {
      description: "JWKS endpoint",
      requestUri: "/jwks/",
      expectedOriginUri: "/jwks.json"
    },
    {
      description: "Invalid nested JWKS path",
      requestUri: "/jwks/invalid_subpath/",
      expectedOriginUri: "/jwks.json"
    },
    {
      description: "JWKS endpoint with file specified",
      requestUri: "/jwks/jwks.json",
      expectedOriginUri: "/jwks.json"
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
