import {handler} from "../src/s3StaticContentRootSlashRedirect"

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("S3 Content URI Rewrite", () => {
  const testCases = [
    {
      description: "Site root redirect",
      requestUri: "/",
      expectedOriginUri: "/site/"
    },
    {
      description: "Site root with URI redirect",
      requestUri: "/page",
      expectedOriginUri: "/site/page"
    },
    {
      description: "Site actual, no redirect",
      requestUri: "/site",
      expectedOriginUri: "/site"
    },
    {
      description: "Site actual with URI, no redirect",
      requestUri: "/site/page",
      expectedOriginUri: "/site/page"
    },
    {
      description: "Two segment URI no redirect",
      requestUri: "/foo/bar",
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
