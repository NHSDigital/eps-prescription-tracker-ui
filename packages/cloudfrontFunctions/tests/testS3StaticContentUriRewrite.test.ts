import {handler} from "../src/s3StaticContentUriRewrite"

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("S3 Content URI Rewrite", () => {
  const testCases = [
    {
      description: "Site root",
      requestUri: "/site",
      expectedOriginUri: "/index.html"
    },
    {
      description: "Site root with trailing /",
      requestUri: "/site/",
      expectedOriginUri: "/index.html"
    },
    {
      description: "Site nested page",
      requestUri: "/site/page",
      expectedOriginUri: "/index.html"
    },
    {
      description: "Site nested page with trailing /",
      requestUri: "/site/page/",
      expectedOriginUri: "/index.html"
    },
    {
      description: "Site deeply nested page",
      requestUri: "/site/area1/area2/page",
      expectedOriginUri: "/index.html"
    },
    {
      description: "Site deeply nested page with trailing /",
      requestUri: "/site/area1/area2/page/",
      expectedOriginUri: "/index.html"
    },
    {
      description: "Static file",
      requestUri: "/site/file.ext",
      expectedOriginUri: "/file.ext"
    },
    {
      description: "Nested static file",
      requestUri: "/site/files/file.ext",
      expectedOriginUri: "/files/file.ext"
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
