import {handler} from "../src/s3StaticContentRootSlashRedirect"

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("S3 Content Root Slash Redirect", () => {
  const testCases = [
    {
      description: "Site root redirect",
      requestUri: "/",
      expectedRedirectUri: "/site"
    },
    {
      description: "Site root with URI redirect",
      requestUri: "/page",
      expectedRedirectUri: "/site/page"
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
      description: "Two segment URI, no redirect",
      requestUri: "/foo/bar",
      expectedOriginUri: "/foo/bar"
    }
  ]

  testCases.forEach(({description, requestUri, expectedRedirectUri, expectedOriginUri}) => {
    it(description, async() => {
      const mockEvent = {
        request: {
          method: "GET",
          uri: requestUri
        }
      }
      const result: any = await handler(mockEvent)

      if (expectedRedirectUri) {
        expect(result.headers.location.value).toEqual(expectedRedirectUri)
      } else {
        expect(result.uri).toEqual(expectedOriginUri)
      }
    })
  })
})
