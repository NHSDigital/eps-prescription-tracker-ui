import {handler} from "../src/s3StaticContentUriRewrite"

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
      requestUri: "/site/file.ext",
      expectedOriginUri: "/v1.0.0/file.ext"
    },
    {
      description: "Current version nested static file",
      requestUri: "/site/files/file.ext",
      expectedOriginUri: "/v1.0.0/files/file.ext"
    },
    {
      description: "Specified version static file",
      requestUri: "/site/v0.9.9/file.ext",
      expectedOriginUri: "/v0.9.9/file.ext"
    },
    {
      description: "Specified version nested static file",
      requestUri: "/site/v0.9.9/files/file.ext",
      expectedOriginUri: "/v0.9.9/files/file.ext"
    },
    {
      description: "Specified PR static file",
      requestUri: "/site/pr-1234/file.ext",
      expectedOriginUri: "/pr-1234/file.ext"
    },
    {
      description: "Specified PR nested static file",
      requestUri: "/site/pr-1234/files/file.ext",
      expectedOriginUri: "/pr-1234/files/file.ext"
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
