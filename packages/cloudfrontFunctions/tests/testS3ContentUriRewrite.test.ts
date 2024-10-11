import {handler} from "../src/s3ContentUriRewrite"

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("S3 Content URI Rewrite", () => {
  const testCases = [
    {
      description: "Current version site root",
      requestUri: "/site/",
      expectedOriginUri: "/v1.0.0/index.html"
    },
    {
      description: "Current version site nested page",
      requestUri: "/site/page/",
      expectedOriginUri: "/v1.0.0/index.html"
    },
    {
      description: "Current version site deeply nested page",
      requestUri: "/site/area1/area2/page/",
      expectedOriginUri: "/v1.0.0/index.html"
    },
    {
      description: "Specified version site root",
      requestUri: "/site/v0.9.9/",
      expectedOriginUri: "/v0.9.9/index.html"
    },
    {
      description: "Specified version site nested page",
      requestUri: "/site/v0.9.9/page/",
      expectedOriginUri: "/v0.9.9/index.html"
    },
    {
      description: "Specified version site deeply nested page",
      requestUri: "/site/v0.9.9/area1/area2/page/",
      expectedOriginUri: "/v0.9.9/index.html"
    },
    {
      description: "Specified PR site root",
      requestUri: "/site/pr-1234/",
      expectedOriginUri: "/pr-1234/index.html"
    },
    {
      description: "Specified PR site nested page",
      requestUri: "/site/pr-1234/page/",
      expectedOriginUri: "/pr-1234/index.html"
    },
    {
      description: "Specified PR site deeply nested page",
      requestUri: "/site/pr-1234/area1/area2/page/",
      expectedOriginUri: "/pr-1234/index.html"
    },
    {
      description: "Current version static file",
      requestUri: "/site/file.etx",
      expectedOriginUri: "/v1.0.0/file.etx"
    },
    {
      description: "Current version nested static file",
      requestUri: "/site/files/file.etx",
      expectedOriginUri: "/v1.0.0/files/file.etx"
    },
    {
      description: "Specified version static file",
      requestUri: "/site/v0.9.9/file.etx",
      expectedOriginUri: "/v0.9.9/file.etx"
    },
    {
      description: "Specified version nested static file",
      requestUri: "/site/v0.9.9/files/file.etx",
      expectedOriginUri: "/v0.9.9/files/file.etx"
    },
    {
      description: "Specified PR static file",
      requestUri: "/site/pr-1234/file.etx",
      expectedOriginUri: "/pr-1234/file.etx"
    },
    {
      description: "Specified PR nested static file",
      requestUri: "/site/pr-1234/files/file.etx",
      expectedOriginUri: "/pr-1234/files/file.etx"
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
      console.log(result)
      expect(result.uri).toEqual(expectedOriginUri)
    })
  })
})
